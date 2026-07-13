import {
  CompanyRegisterDTO,
  CompanyRegisterResponseDTO,
  EmployeeRegisterDTO,
  EmployeeRegisterResponseDTO,
  FacebookAuthDTO,
  LoginResponseDTO,
  ForgotPasswordResponseDTO,
  ForgotPasswordDTO,
  GithubAuthDTO,
  GoogleAuthDTO,
  LinkedInAuthDTO,
  LoginDTO,
  LoginOtpDTO,
  LoginOtpResponseDTO,
  ResetPasswordResponseDTO,
  ResetPasswordDTO,
  RefreshTokenResponseDTO,
  RefreshTokenDTO,
  VerifyEmailResponseDTO,
  VerifyOtpDTO,
  VerifyOtpResponseDTO,
  FacebookLoginResponseDTO,
  GithubLoginResponseDTO,
  GoogleLoginResponseDTO,
  LinkedInLoginResponseDTO,
  VerifyEmailDTO,
  TwoFactorSetupDTO,
  TwoFactorSetupResponseDTO,
  TwoFactorEnableDTO,
  TwoFactorEnableResponseDTO,
  TwoFactorDisableDTO,
  TwoFactorDisableResponseDTO,
  TwoFactorVerifyLoginDTO,
  TwoFactorVerifyLoginResponseDTO,
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

export const I_TWO_FACTOR_SERVICE = 'ITwoFactorService';

export interface ILoginService {
  login(loginDTO: LoginDTO): Promise<LoginResponseDTO>;
}

export interface IRegisterService {
  companyRegister(
    companyRegisterDTO: CompanyRegisterDTO,
  ): Promise<CompanyRegisterResponseDTO>;
  employeeRegister(
    employeeRegisterDTO: EmployeeRegisterDTO,
  ): Promise<EmployeeRegisterResponseDTO>;
}

export interface IForgotPasswordService {
  forgotPassword(
    forgotPasswordDTO: ForgotPasswordDTO,
  ): Promise<ForgotPasswordResponseDTO>;
}

export interface IResetPasswordService {
  resetPassword(
    resetPasswordDTO: ResetPasswordDTO,
  ): Promise<ResetPasswordResponseDTO>;
}

export interface IRefreshTokenService {
  refreshToken(
    refreshTokenDTO: RefreshTokenDTO,
  ): Promise<RefreshTokenResponseDTO>;
}

export interface IVerifyEmailService {
  verifyEmail(verifyEmailDTO: VerifyEmailDTO): Promise<VerifyEmailResponseDTO>;
}

export interface ILoginOTPService {
  loginOtp(loginOtpDTO: LoginOtpDTO): Promise<LoginOtpResponseDTO>;
  verifyOtp(verifyOtpDTO: VerifyOtpDTO): Promise<VerifyOtpResponseDTO>;
}

export interface IGoogleAuthService {
  googleLogin(googleDataDTO: GoogleAuthDTO): Promise<GoogleLoginResponseDTO>;
}

export interface ILinkedInAuthService {
  linkedInLogin(
    linkedInDataDTO: LinkedInAuthDTO,
  ): Promise<LinkedInLoginResponseDTO>;
}

export interface IGithubAuthService {
  githubLogin(githubDataDTO: GithubAuthDTO): Promise<GithubLoginResponseDTO>;
}

export interface IFacebookAuthService {
  facebookLogin(
    facebookDataDTO: FacebookAuthDTO,
  ): Promise<FacebookLoginResponseDTO>;
}

export interface ITwoFactorService {
  twoFactorSetup(
    twoFactorSetupDTO: TwoFactorSetupDTO,
  ): Promise<TwoFactorSetupResponseDTO>;
  twoFactorEnable(
    twoFactorEnableDTO: TwoFactorEnableDTO,
  ): Promise<TwoFactorEnableResponseDTO>;
  twoFactorDisable(
    twoFactorDisableDTO: TwoFactorDisableDTO,
  ): Promise<TwoFactorDisableResponseDTO>;
  twoFactorVerifyLogin(
    twoFactorVerifyLoginDTO: TwoFactorVerifyLoginDTO,
  ): Promise<TwoFactorVerifyLoginResponseDTO>;
}
