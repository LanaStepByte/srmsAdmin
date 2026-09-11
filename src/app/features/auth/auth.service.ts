import { Injectable } from '@angular/core';
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

  private jsonRequest(method: string, body: unknown, accessToken?: string): RequestInit {
    return {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
    };
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    if (!response.ok) {
      throw new Error(`Request failed with HTTP ${response.status}.`);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
}
