import { apiClient } from './client';
import type { User, LoginDto, VerifyTotpDto } from '@/types';

export interface LoginResponse {
  requireTotp: boolean;
  requireTotpSetup?: boolean;
  tempToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: User;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface TotpSetupResponse {
  qrCodeDataUrl: string;
  secret: string;
}

export const authApi = {
  login: (data: LoginDto) =>
    apiClient.post<LoginResponse>('/auth/login', data, { skipAuth: true }),

  verifyTotp: (data: VerifyTotpDto) =>
    apiClient.post<AuthResponse>('/auth/verify-totp', data, { skipAuth: true }),

  refresh: (refreshToken: string) =>
    apiClient.post<AuthResponse>('/auth/refresh', { refreshToken }, { skipAuth: true }),

  logout: (refreshToken?: string) =>
    apiClient.post<void>('/auth/logout', { refreshToken }),

  me: () =>
    apiClient.get<User>('/auth/me'),

  setupTotp: () =>
    apiClient.post<TotpSetupResponse>('/auth/setup-totp', {}),

  confirmTotp: (code: string) =>
    apiClient.post<void>('/auth/confirm-totp', { code }),
};
