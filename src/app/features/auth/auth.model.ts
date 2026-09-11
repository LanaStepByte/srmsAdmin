export interface RegisterDraft {
  email?: string;
  phone?: string;
  password?: string;
}

export type StrictRegisterPayload = Readonly<Required<RegisterDraft>>;

export interface RegistrationFormModel {
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface LoginFormModel {
  email: string;
  password: string;
}

export interface PhoneValidationResult {
  isDuplicate: boolean;
  suggestedFormat: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface CurrentUser {
  id: string;
  email: string;
  role: string;
}
