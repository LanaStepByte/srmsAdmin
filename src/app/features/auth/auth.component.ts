import { Component, computed, inject, resource, signal } from '@angular/core';
import {
  FieldTree,
  FormField,
  email,
  form,
  minLength,
  pattern,
  required,
  submit,
  validate,
  validateAsync,
} from '@angular/forms/signals';
import { AuthService } from './auth.service';
import {
  AuthTokens,
  LoginFormModel,
  RegistrationFormModel,
  StrictRegisterPayload,
} from './auth.model';

const PHONE_PATTERN = /^\+995-5\d{2}-\d{2}-\d{2}-\d{2}$/;

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormField],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent {
  private readonly authService = inject(AuthService);

  protected readonly activeView = signal<'register' | 'login'>('register');
  protected readonly serverMessage = signal<string | null>(null);
  protected readonly serverError = signal<string | null>(null);
  protected readonly tokens = signal<AuthTokens | null>(null);

  protected readonly registrationModel = signal<RegistrationFormModel>({
    email: '',
    displayName: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  protected readonly loginModel = signal<LoginFormModel>({ email: '', password: '' });

  protected readonly registrationForm = form(this.registrationModel, (registration) => {
    required(registration.email);
    email(registration.email);
    required(registration.displayName);
    required(registration.phone);
    pattern(registration.phone, PHONE_PATTERN, { message: 'Use +995-5xx-xx-xx-xx.' });
    required(registration.password);
    minLength(registration.password, 8);
    required(registration.confirmPassword);
    validate(registration.confirmPassword, ({ value, valueOf }) =>
      value() !== valueOf(registration.password)
        ? { kind: 'passwordMismatch', message: 'Passwords must match.' }
        : undefined,
    );
    validateAsync(registration.phone, {
      params: ({ value }) => value(),
      debounce: 350,
      factory: (phone) =>
        resource({
          params: () => phone(),
          loader: ({ params, abortSignal }) => this.authService.checkPhone(params, abortSignal),
        }),
      onSuccess: (result) =>
        result.isDuplicate
          ? {
              kind: 'phoneDuplicate',
              message: `Phone is already registered. Suggested format: ${result.suggestedFormat}`,
            }
          : undefined,
      onError: () => ({
        kind: 'phoneServerError',
        message: 'Phone validation service is unavailable. Try again.',
      }),
    });
  });

  protected readonly loginForm = form(this.loginModel, (login) => {
    required(login.email);
    email(login.email);
    required(login.password);
    minLength(login.password, 8);
  });

  protected readonly registerDisabled = computed(
    () =>
      this.registrationForm().invalid() ||
      this.registrationForm().pending() ||
      this.registrationForm().submitting(),
  );

  protected setView(view: 'register' | 'login'): void {
    this.activeView.set(view);
    this.serverMessage.set(null);
    this.serverError.set(null);
  }

  protected showErrors(field: FieldTree<unknown>): boolean {
    const state = field();
    return state.invalid() && (state.touched() || state.dirty());
  }

  protected async register(): Promise<void> {
    this.serverMessage.set(null);
    this.serverError.set(null);
    await submit(this.registrationForm, {
      ignoreValidators: 'none',
      onInvalid: (field) => field().markAsTouched(),
      action: async () => {
        const value = this.registrationModel();
        const payload: StrictRegisterPayload = Object.freeze({
          email: value.email,
          password: value.password,
          displayName: value.displayName,
        });
        try {
          await this.authService.register(payload);
          this.activeView.set('login');
          this.serverMessage.set('Student account created. You can now sign in.');
        } catch (error) {
          this.serverError.set(this.messageFor(error, 'Registration failed. Please try again.'));
        }
        return undefined;
      },
    });
  }

  protected async login(): Promise<void> {
    this.serverMessage.set(null);
    this.serverError.set(null);
    await submit(this.loginForm, {
      ignoreValidators: 'none',
      onInvalid: (field) => field().markAsTouched(),
      action: async () => {
        try {
          const tokens = await this.authService.login(this.loginModel());
          this.tokens.set(tokens);
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);
          this.serverMessage.set('Signed in. Token pair stored for this lesson.');
        } catch (error) {
          this.serverError.set(this.messageFor(error, 'Login failed. Check your credentials.'));
        }
        return undefined;
      },
    });
  }

  protected errors(field: FieldTree<unknown>): readonly { kind: string; message?: string }[] {
    return field().errors() as readonly { kind: string; message?: string }[];
  }

  private messageFor(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}
