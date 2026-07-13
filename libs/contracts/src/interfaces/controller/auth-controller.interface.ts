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
  CompanyRegisterDTO,
  EmployeeRegisterDTO,
  VerifyOtpDTO,
  VerifyOtpResponseDTO,
  LoginOtpDTO,
  LoginOtpResponseDTO,
  VerifyEmailDTO,
  TwoFactorSetupResponseDTO,
  TwoFactorEnableDTO,
  TwoFactorEnableResponseDTO,
  TwoFactorDisableDTO,
  TwoFactorDisableResponseDTO,
  TwoFactorVerifyLoginDTO,
  TwoFactorVerifyLoginResponseDTO,
  TwoFactorSetupDTO,
} from '@app/contracts/dtos/auth';
import { Response, Request } from 'express';

export interface IBasicAuthLoginController {
  login(loginDTO: LoginDTO, res: Response): Promise<LoginResponseDTO>;
}

export interface IBasicAuthLoginRpcController {
  login(loginDTO: LoginDTO): Promise<LoginResponseDTO>;
}

export interface IBasicAuthForgotPasswordController {
  forgotPassword(
    forgotPasswordDTO: ForgotPasswordDTO,
  ): Promise<ForgotPasswordResponseDTO>;
}

export interface IBasicAuthForgotPasswordRpcController {
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

export interface IBasicAuthResetPasswordRpcController {
  resetPassword(
    resetPasswordDTO: ResetPasswordDTO,
  ): Promise<ResetPasswordResponseDTO>;
}

export interface IBasicAuthRefreshTokenController {
  refreshToken(
    req: Request,
    res: Response,
  ): Promise<RefreshTokenResponseDTO>;
}

export interface IBasicAuthRefreshTokenRpcController {
  refreshToken(
    refreshTokenDTO: RefreshTokenDTO,
  ): Promise<RefreshTokenResponseDTO>;
}

export interface IBasicAuthVerifyEmailController {
  verifyEmail(
    emailVerificationToken: VerifyEmailDTO,
  ): Promise<VerifyEmailResponseDTO>;
}

export interface IBasicAuthVerifyEmailRpcController {
  verifyEmail(
    emailVerificationToken: VerifyEmailDTO,
  ): Promise<VerifyEmailResponseDTO>;
}

export interface IBasicAuthRegisterController {
  registerCompany(
    companyRegisterDTO: CompanyRegisterDTO,
    res: Response,
  ): Promise<CompanyRegisterResponseDTO>;
  registerEmployee(
    employeeRegisterDTO: EmployeeRegisterDTO,
    res: Response,
  ): Promise<EmployeeRegisterResponseDTO>;
}

export interface IBasicAuthRegisterRpcController {
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
    res: Response,
  ): Promise<VerifyOtpResponseDTO>;
}

export interface IBasicAuthLoginOTPRpcController {
  loginOtp(loginOtpDTO: LoginOtpDTO): Promise<LoginOtpResponseDTO>;
  verifyOtp(verifyOtpDTO: VerifyOtpDTO): Promise<VerifyOtpResponseDTO>;
}

export interface IBasicAuthTwoFactorController {
  twoFactorSetup(req: Request): Promise<TwoFactorSetupResponseDTO>;
  twoFactorEnable(
    req: Request,
    twoFactorEnableDTO: Pick<TwoFactorEnableDTO, 'otp'>,
  ): Promise<TwoFactorEnableResponseDTO>;
  twoFactorDisable(
    req: Request,
    twoFactorDisableDTO: Pick<TwoFactorDisableDTO, 'otp'>,
  ): Promise<TwoFactorDisableResponseDTO>;
  twoFactorVerifyLogin(
    twoFactorVerifyLoginDTO: TwoFactorVerifyLoginDTO,
    res: Response,
  ): Promise<TwoFactorVerifyLoginResponseDTO>;
}

export interface IBasicAuthTwoFactorRpcController {
  twoFactorSetup(
    twoFactorSetupDTO: TwoFactorSetupDTO,
  ): Promise<TwoFactorSetupResponseDTO>;
  twoFactorEnable(
    twoFactorEnableDTO: Pick<TwoFactorEnableDTO, 'otp'>,
  ): Promise<TwoFactorEnableResponseDTO>;
  twoFactorDisable(
    twoFactorDisableDTO: Pick<TwoFactorDisableDTO, 'otp'>,
  ): Promise<TwoFactorDisableResponseDTO>;
  twoFactorVerifyLogin(
    twoFactorVerifyLoginDTO: TwoFactorVerifyLoginDTO,
  ): Promise<TwoFactorVerifyLoginResponseDTO>;
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
    IBasicAuthLoginOTPController,
    IBasicAuthTwoFactorController {}

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
