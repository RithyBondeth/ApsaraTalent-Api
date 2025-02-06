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