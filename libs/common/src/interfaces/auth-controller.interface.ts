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

export interface IBasicAuthRegisterController {
    registerCompany(data?: any): Promise<any>;
    registerEmployee(data?: any): Promise<any>;
}

export interface IBasicAuthLoginOTPController {
    loginOtp(data?: any): Promise<any>;
    verifyOtp(data?: any): Promise<any>;
}

export interface IBasicAuthController extends 
IBasicAuthRegisterController, 
IBasicAuthLoginController,
IBasicAuthForgotPasswordController,
IBasicAuthResetPasswordController,
IBasicAuthRefreshTokenController,
IBasicAuthVerifyEmailController,
IBasicAuthLoginOTPController
{}

export interface IGoogleAuthController {
    googleAuth(data?: any): Promise<any>;
}

export interface ILinkedInAuthController {
    linkedInAuth(data?: any): Promise<any>;
}

export interface IGithubAuthController {
    githubAuth(data?: any): Promise<any>;
}

export interface IFacebookAuthController {
    facebookAuth(data?: any): Promise<any>;
}