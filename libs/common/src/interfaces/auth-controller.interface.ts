export interface IBasicAuthLoginController {
  login(loginDTO: any, res: any): Promise<any>;
}

export interface IBasicAuthForgotPasswordController {
  forgotPassword(forgotPasswordDTO: any): Promise<any>;
}

export interface IBasicAuthResetPasswordController {
  resetPassword(resetPasswordDTO: any, token: string): Promise<any>;
}

export interface IBasicAuthRefreshTokenController {
  refreshToken(refreshTokenDTO: any, res: any): Promise<any>;
}

export interface IBasicAuthVerifyEmailController {
  verifyEmail(emailVerificationToken: string): Promise<any>;
}

export interface IBasicAuthRegisterController {
  registerCompany(companyRegisterDTO: any): Promise<any>;
  registerEmployee(employeeRegisterDTO: any): Promise<any>;
}

export interface IBasicAuthLoginOTPController {
  loginOtp(loginOtpDTO: any): Promise<any>;
  verifyOtp(verifyOtpDTO: any, res: any): Promise<any>;
}

export interface IBasicAuthIceServersController {
  getIceServers(): Promise<any>;
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
