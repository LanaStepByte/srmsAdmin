import {
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormField,
  form,
  submit,
} from '@angular/forms/signals';

import { AuthService } from './auth.service';
import {
  AuthTokens,
  LoginFormModel,
  RegistrationFormModel,
  StrictRegisterPayload,
} from './auth.model';

const INITIAL_REGISTRATION:
  RegistrationFormModel = {
    email: '',
    displayName: '',
    phone: '',
    password: '',
    confirmPassword: '',
  };

const INITIAL_LOGIN:
  LoginFormModel = {
    email: '',
    password: '',
  };

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    FormField,
  ],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent {
  private readonly authService =
    inject(AuthService);

  protected readonly activeView =
    signal<'register' | 'login'>(
      'register',
    );

  protected readonly serverMessage =
    signal<string | null>(null);

  protected readonly serverError =
    signal<string | null>(null);

  protected readonly tokens =
    signal<AuthTokens | null>(null);

  // ==========================================
  // BEFORE LECTURE 46:
  // Signal Forms already exist.
  // Validators do NOT exist yet.
  // Phone async check does NOT exist yet.
  // ==========================================

  protected readonly registrationModel =
    signal<RegistrationFormModel>({
      ...INITIAL_REGISTRATION,
    });

  protected readonly loginModel =
    signal<LoginFormModel>({
      ...INITIAL_LOGIN,
    });

  protected readonly registrationForm =
    form(this.registrationModel);

  protected readonly loginForm =
    form(this.loginModel);

  protected setView(
    view: 'register' | 'login',
  ): void {
    this.activeView.set(view);
    this.serverMessage.set(null);
    this.serverError.set(null);
  }

  protected async register(
    event: Event,
  ): Promise<void> {
    event.preventDefault();

    this.serverMessage.set(null);
    this.serverError.set(null);

    await submit(
      this.registrationForm,
      async (field) => {
        const value =
          field().value();

        const payload:
          StrictRegisterPayload = {
            email:
              value.email
                .trim()
                .toLowerCase(),
            password:
              value.password,
            displayName:
              value.displayName.trim(),
          };

        try {
          await this.authService
            .register(payload);

          this.loginModel.set({
            email:
              payload.email,
            password: '',
          });

          field().reset({
            ...INITIAL_REGISTRATION,
          });

          this.activeView.set(
            'login',
          );

          this.serverMessage.set(
            'Student account created. You can now sign in.',
          );
        } catch (error) {
          this.serverError.set(
            this.messageFor(
              error,
              'Registration failed. Please try again.',
            ),
          );
        }

        return;
      },
    );
  }

  protected async login(
    event: Event,
  ): Promise<void> {
    event.preventDefault();

    this.serverMessage.set(null);
    this.serverError.set(null);

    await submit(
      this.loginForm,
      async (field) => {
        const value =
          field().value();

        const credentials:
          LoginFormModel = {
            email:
              value.email
                .trim()
                .toLowerCase(),
            password:
              value.password,
          };

        try {
          const tokens =
            await this.authService
              .login(credentials);

          this.tokens.set(tokens);

          localStorage.setItem(
            'accessToken',
            tokens.accessToken,
          );

          localStorage.setItem(
            'refreshToken',
            tokens.refreshToken,
          );

          this.serverMessage.set(
            'Signed in. Token pair stored for this lesson.',
          );
        } catch (error) {
          this.serverError.set(
            this.messageFor(
              error,
              'Login failed. Check your credentials.',
            ),
          );
        }

        return;
      },
    );
  }

  private messageFor(
    error: unknown,
    fallback: string,
  ): string {
    return error instanceof Error
      ? error.message
      : fallback;
  }
}
