export interface StrictRegisterPayload {
  email: string;
  password: string;
  displayName: string;
}

export interface RegistrationFormModel {
  email: string;
  displayName: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface LoginFormModel {
  email: string;
  password: string;
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
