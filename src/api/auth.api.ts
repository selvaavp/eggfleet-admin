import api from '@/lib/axios';
import type {
  ApiResponse,
  LoginPayload,
  LoginResponse,
  OtpRequestPayload,
  VerifyOtpPayload,
  ResetPasswordPayload,
} from '@/types';

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<ApiResponse<LoginResponse>>('/auth/login', payload).then((r) => r.data.data),

  requestForgotPasswordOtp: (identifier: string) =>
    api
      .post<ApiResponse<{ expiresInMinutes: number }>>('/auth/otp/request', {
        identifier,
        type: 'FORGOT_PASSWORD',
      } satisfies OtpRequestPayload)
      .then((r) => r.data.data),

  verifyOtp: (payload: VerifyOtpPayload) =>
    api
      .post<ApiResponse<{ resetToken: string }>>('/auth/otp/verify', payload)
      .then((r) => r.data.data),

  resetPassword: (payload: ResetPasswordPayload) =>
    api.post<ApiResponse<null>>('/auth/password/reset', payload).then((r) => r.data.data),
};
