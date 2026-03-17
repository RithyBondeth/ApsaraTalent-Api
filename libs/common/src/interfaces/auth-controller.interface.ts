<<<<<<< HEAD
export interface IBasicAuthRegisterController {
    register(body: any, file: Express.Multer.File): Promise<any>;
}

export interface IBasicAuthLoginController {
    login(body: any): Promise<any>;
}

export interface IBasicAuthForgotPasswordController {
    forgotPassword(body: any): Promise<any>;
}

export interface IBasicAuthResetPasswordController {
    resetPassword(body: any, token: string): Promise<any>;
}

export interface IBasicAuthRefreshTokenController {
    refreshToken(body: any): Promise<any>;
}

export interface IBasicAuthVerifyEmailController {
    verifyEmail(token: string): Promise<any>;
}

export interface IBasicAuthController extends 
IBasicAuthRegisterController, 
IBasicAuthLoginController,
IBasicAuthForgotPasswordController,
IBasicAuthResetPasswordController,
IBasicAuthRefreshTokenController,
IBasicAuthVerifyEmailController
{}

export interface IGoogleAuthController {
    googleAuth(data?: any): Promise<any>;
}

export interface ILinkedInAuthController {
    linkedinAuth(): Promise<any>;
}
=======
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

export interface IBasicAuthController
  extends
    IBasicAuthRegisterController,
    IBasicAuthLoginController,
    IBasicAuthForgotPasswordController,
    IBasicAuthResetPasswordController,
    IBasicAuthRefreshTokenController,
    IBasicAuthVerifyEmailController,
    IBasicAuthLoginOTPController {}

export interface IGoogleAuthController {
  googleAuth(params?: any): Promise<any>;
  googleCallback(req: any, res: any, params?: any): Promise<any>;
}

export interface ILinkedInAuthController {
  linkedInAuth(params?: any): Promise<any>;
  linkedInCallback(req: any, res: any): Promise<any>;
}

export interface IGithubAuthController {
  githubAuth(params?: any): Promise<any>;
  githubCallback(req: any, res: any): Promise<any>;
}

export interface IFacebookAuthController {
  facebookAuth(params?: any): Promise<any>;
  facebookCallback(req: any, res: any): Promise<any>;
}
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
