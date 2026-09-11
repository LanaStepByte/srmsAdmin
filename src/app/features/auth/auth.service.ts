import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, fromEvent, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  AuthTokens,
  CurrentUser,
  LoginFormModel,
  PhoneValidationResult,
  StrictRegisterPayload,
} from './auth.model';

const AUTH_API = '/api/v1/auth';
const VALIDATION_API = '/api/v1/enterprise/validation';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  async checkPhone(number: string, abortSignal: AbortSignal): Promise<PhoneValidationResult> {
    const url = `${VALIDATION_API}/check-phone?number=${encodeURIComponent(number)}`;
    return this.request<PhoneValidationResult>(url, { signal: abortSignal });
  }

  register(payload: StrictRegisterPayload): Promise<void> {
    return this.request<void>(`${AUTH_API}/register`, this.jsonRequest('POST', payload));
  }

  login(credentials: LoginFormModel): Promise<AuthTokens> {
    return this.request<AuthTokens>(`${AUTH_API}/login`, this.jsonRequest('POST', credentials));
  }

  refresh(refreshToken: string): Promise<AuthTokens> {
    return this.request<AuthTokens>(
      `${AUTH_API}/refresh`,
      this.jsonRequest('POST', { refreshToken }),
    );
  }

  logout(refreshToken: string, accessToken: string): Promise<void> {
    return this.request<void>(
      `${AUTH_API}/logout`,
      this.jsonRequest('POST', { refreshToken }, accessToken),
    );
  }

  me(accessToken: string): Promise<CurrentUser> {
    return this.request<CurrentUser>(`${AUTH_API}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  private jsonRequest(method: string, body: unknown, accessToken?: string): HttpRequestOptions {
    return {
      method,
      body,
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      }),
    };
  }

  private async request<T>(url: string, options: HttpRequestOptions = {}): Promise<T> {
    try {
      let request$: Observable<import('@angular/common/http').HttpResponse<T>> =
        this.http.request<T>(options.method ?? 'GET', url, {
          body: options.body,
          headers:
            options.headers instanceof HttpHeaders
              ? options.headers
              : options.headers
                ? new HttpHeaders(options.headers)
                : undefined,
          observe: 'response' as const,
        });
      if (options.signal) {
        request$ = request$.pipe(takeUntil(fromEvent(options.signal, 'abort')));
      }
      const response = await firstValueFrom(request$);

      if (response.status === 204) return undefined as T;
      return response.body as T;
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        throw new Error(`Request failed with HTTP ${error.status}.`);
      }
      throw error;
    }
  }
}

interface HttpRequestOptions {
  method?: string;
  body?: unknown;
  headers?: HttpHeaders | Record<string, string>;
  signal?: AbortSignal;
}
