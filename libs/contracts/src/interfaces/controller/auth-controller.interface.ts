import {
  LoginResponseDTO,
  ForgotPasswordResponseDTO,
  ResetPasswordResponseDTO,
  RefreshTokenResponseDTO,
  VerifyEmailResponseDTO,
  CompanyRegisterResponseDTO,
  EmployeeRegisterResponseDTO,
  LoginDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  RefreshTokenDTO,
  VerifyEmailDTO,
  CompanyRegisterDTO,
  EmployeeRegisterDTO,
  VerifyOtpDTO,
  VerifyOtpResponseDTO,
  LoginOtpDTO,
  LoginOtpResponseDTO,
} from '@app/contracts/dtos/auth';

export interface IBasicAuthLoginController {
  login(loginDTO: LoginDTO, res: any): Promise<LoginResponseDTO>;
}

export interface IBasicAuthForgotPasswordController {
  forgotPassword(
    forgotPasswordDTO: ForgotPasswordDTO,
  ): Promise<ForgotPasswordResponseDTO>;
}

export interface IBasicAuthResetPasswordController {
  resetPassword(
    resetPasswordDTO: ResetPasswordDTO,
    token: string,
  ): Promise<ResetPasswordResponseDTO>;
}

export interface IBasicAuthRefreshTokenController {
  refreshToken(
    refreshTokenDTO: RefreshTokenDTO,
    res: any,
  ): Promise<RefreshTokenResponseDTO>;
}

export interface IBasicAuthVerifyEmailController {
  verifyEmail(
    emailVerificationToken: VerifyEmailDTO,
  ): Promise<VerifyEmailResponseDTO>;
}

export interface IBasicAuthRegisterController {
  registerCompany(
    companyRegisterDTO: CompanyRegisterDTO,
  ): Promise<CompanyRegisterResponseDTO>;
  registerEmployee(
    employeeRegisterDTO: EmployeeRegisterDTO,
  ): Promise<EmployeeRegisterResponseDTO>;
}

export interface IBasicAuthLoginOTPController {
  loginOtp(loginOtpDTO: LoginOtpDTO): Promise<LoginOtpResponseDTO>;
  verifyOtp(
    verifyOtpDTO: VerifyOtpDTO,
    res: any,
  ): Promise<VerifyOtpResponseDTO>;
}

export interface IBasicAuthIceServersController {
  getIceServers(): Promise<{ iceServers: object[] }>;
}

export interface IBasicAuthController
  extends
    IBasicAuthRegisterController,
    IBasicAuthLoginController,
    IBasicAuthForgotPasswordController,
    IBasicAuthResetPasswordController,
    IBasicAuthRefreshTokenController,
    IBasicAuthVerifyEmailController,
    IBasicAuthIceServersController,
    IBasicAuthLoginOTPController {}

export interface IGoogleAuthMicroserviceController {
  googleAuth(params?: any): Promise<any>;
}
export interface IGoogleAuthController extends IGoogleAuthMicroserviceController {
  googleCallback(req: any, res: any, params?: any): Promise<any>;
}

export interface ILinkedInAuthMicroserviceController {
  linkedInAuth(params?: any): Promise<any>;
}
export interface ILinkedInAuthController extends ILinkedInAuthMicroserviceController {
  linkedInCallback(req: any, res: any): Promise<any>;
}

export interface IGithubAuthMicroserviceController {
  githubAuth(params?: any): Promise<any>;
}
export interface IGithubAuthController extends IGithubAuthMicroserviceController {
  githubCallback(req: any, res: any): Promise<any>;
}

export interface IFacebookAuthMicroserviceController {
  facebookAuth(params?: any): Promise<any>;
}
export interface IFacebookAuthController extends IFacebookAuthMicroserviceController {
  facebookCallback(req: any, res: any): Promise<any>;
}
