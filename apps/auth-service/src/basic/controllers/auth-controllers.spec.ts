import 'reflect-metadata';
import { ForgotPasswordController } from './forgot-password.controller';
import { LoginOTPController } from './login-otp.controller';
import { LoginController } from './login.controller';
import { RefreshTokenController } from './refresh-token.controller';
import { RegisterController } from './register.controller';
import { ResetPasswordController } from './reset-password.controller';
import { VerifyEmailController } from './verify-email.controller';
import { FacebookAuthController } from '../../socials/controllers/facebook-auth.controller';
import { GithubAuthController } from '../../socials/controllers/github-auth.controller';
import { GoogleAuthController } from '../../socials/controllers/google-auth.controller';
import { LinkedInAuthController } from '../../socials/controllers/linkedin-auth.controller';

describe('Authentication RPC controllers', () => {
  it('delegates every basic authentication request unchanged', async () => {
    const cases: Array<[new (service: any) => any, string, string]> = [
      [ForgotPasswordController, 'forgotPassword', 'forgotPassword'],
      [LoginController, 'login', 'login'],
      [RefreshTokenController, 'refreshToken', 'refreshToken'],
      [ResetPasswordController, 'resetPassword', 'resetPassword'],
      [VerifyEmailController, 'verifyEmail', 'verifyEmail'],
    ];
    for (const [Controller, controllerMethod, serviceMethod] of cases) {
      const service = {
        [serviceMethod]: jest.fn().mockResolvedValue({ ok: true }),
      };
      const dto = { value: controllerMethod };
      await new Controller(service)[controllerMethod](dto);
      expect(service[serviceMethod]).toHaveBeenCalledWith(dto);
    }
  });

  it('delegates OTP request and verification separately', async () => {
    const service = {
      loginOtp: jest.fn().mockResolvedValue({}),
      verifyOtp: jest.fn().mockResolvedValue({}),
    };
    const controller = new LoginOTPController(service as any);
    const login = { email: 'person@example.com' } as any;
    const verify = { email: 'person@example.com', otp: '123456' } as any;
    await controller.loginOtp(login);
    await controller.verifyOtp(verify);
    expect(service.loginOtp).toHaveBeenCalledWith(login);
    expect(service.verifyOtp).toHaveBeenCalledWith(verify);
  });

  it('delegates company and employee registration to their distinct methods', async () => {
    const service = {
      companyRegister: jest.fn().mockResolvedValue({}),
      employeeRegister: jest.fn().mockResolvedValue({}),
    };
    const controller = new RegisterController(service as any);
    const company = { email: 'company@example.com' } as any;
    const employee = { email: 'employee@example.com' } as any;
    await controller.registerCompany(company);
    await controller.registerEmployee(employee);
    expect(service.companyRegister).toHaveBeenCalledWith(company);
    expect(service.employeeRegister).toHaveBeenCalledWith(employee);
  });

  it('delegates each social provider to only its matching service', async () => {
    const cases: Array<[new (service: any) => any, string, string]> = [
      [FacebookAuthController, 'facebookAuth', 'facebookLogin'],
      [GithubAuthController, 'githubAuth', 'githubLogin'],
      [GoogleAuthController, 'googleAuth', 'googleLogin'],
      [LinkedInAuthController, 'linkedInAuth', 'linkedInLogin'],
    ];
    for (const [Controller, controllerMethod, serviceMethod] of cases) {
      const service = { [serviceMethod]: jest.fn().mockResolvedValue({}) };
      const dto = { providerId: `${controllerMethod}-id` };
      await new Controller(service)[controllerMethod](dto);
      expect(service[serviceMethod]).toHaveBeenCalledWith(dto);
    }
  });
});
