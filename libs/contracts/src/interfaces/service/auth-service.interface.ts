import {
  LoginResponseDTO,
  ForgotPasswordResponseDTO,
  ResetPasswordResponseDTO,
  RefreshTokenResponseDTO,
  VerifyEmailResponseDTO,
} from '@app/contracts/dtos/auth';

export const I_LOGIN_SERVICE = 'ILoginService';
export const I_REGISTER_SERVICE = 'IRegisterService';
export const I_FORGOT_PASSWORD_SERVICE = 'IForgotPasswordService';
export const I_RESET_PASSWORD_SERVICE = 'IResetPasswordService';
export const I_REFRESH_TOKEN_SERVICE = 'IRefreshTokenService';
export const I_VERIFY_EMAIL_SERVICE = 'IVerifyEmailService';
export const I_LOGIN_OTP_SERVICE = 'ILoginOTPService';

export const I_GOOGLE_AUTH_SERVICE = 'IGoogleAuthService';
export const I_LINKEDIN_AUTH_SERVICE = 'ILinkedInAuthService';
export const I_GITHUB_AUTH_SERVICE = 'IGithubAuthService';
export const I_FACEBOOK_AUTH_SERVICE = 'IFacebookAuthService';

export interface ILoginService {
  login(loginDTO: any): Promise<LoginResponseDTO>;
}

export interface IRegisterService {
  companyRegister(companyRegisterDTO: any): Promise<any>;
  employeeRegister(employeeRegisterDTO: any): Promise<any>;
}

export interface IForgotPasswordService {
  forgotPassword(forgotPasswordDTO: any): Promise<ForgotPasswordResponseDTO>;
}

export interface IResetPasswordService {
  resetPassword(resetPasswordDTO: any): Promise<ResetPasswordResponseDTO>;
}

export interface IRefreshTokenService {
  refreshToken(refreshTokenDTO: any): Promise<RefreshTokenResponseDTO>;
}

export interface IVerifyEmailService {
  verifyEmail(token: string): Promise<VerifyEmailResponseDTO>;
}

export interface ILoginOTPService {
  loginOtp(loginOtpDTO: any): Promise<any>;
  verifyOtp(verifyOtpDTO: any): Promise<any>;
}

export interface IGoogleAuthService {
  googleLogin(googleData: any): Promise<any>;
}

export interface ILinkedInAuthService {
  linkedInLogin(linkedInData: any): Promise<any>;
}

export interface IGithubAuthService {
  githubLogin(githubData: any): Promise<any>;
}

export interface IFacebookAuthService {
  facebookLogin(facebookData: any): Promise<any>;
}
