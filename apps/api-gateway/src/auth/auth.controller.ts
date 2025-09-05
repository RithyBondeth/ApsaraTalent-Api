import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ThrottlerGuard } from '@app/common/throttler/guards/throttler.guard';
import { IBasicAuthController } from '@app/common/interfaces/auth-controller.interface';
import { Response } from 'express';

@Controller('auth')
export class AuthController implements IBasicAuthController {
  constructor(
    @Inject(AUTH_SERVICE.NAME) private readonly authClient: ClientProxy,
  ) {}

  @Post('register-company')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  async registerCompany(@Body() companyRegisterDTO: any): Promise<any> {
    const payload = { ...companyRegisterDTO };
    return await firstValueFrom(
      this.authClient.send(AUTH_SERVICE.ACTIONS.REGISTER_COMPANY, payload),
    );
  }

  @Post('register-employee')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  async registerEmployee(@Body() employeeRegisterDTO: any): Promise<any> {
    const payload = { ...employeeRegisterDTO };
    return await firstValueFrom(
      this.authClient.send(AUTH_SERVICE.ACTIONS.REGISTER_EMPLOYEE, payload),
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async login(
    @Body() loginDTO: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    const payload = { ...loginDTO };

    const { accessToken, refreshToken, user, message } = await firstValueFrom(
      this.authClient.send(AUTH_SERVICE.ACTIONS.LOGIN, payload),
    );

    // Set HTTP-only cookies
    res.cookie('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    res.cookie('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });

    return {
      message,
      refreshToken,
      accessToken,
      user,
    };
  }

  @Post('login-otp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async loginOtp(@Body() loginOtpDTO: any): Promise<any> {
    return await firstValueFrom(
      this.authClient.send(AUTH_SERVICE.ACTIONS.LOGIN_OTP, loginOtpDTO),
    );
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async verifyOtp(
    @Body() verifyOtpDTO: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    const response = await firstValueFrom(
      this.authClient.send(AUTH_SERVICE.ACTIONS.VERIFY_OTP, verifyOtpDTO),
    );

    const { accessToken, refreshToken, user, message } = response;

    res.cookie('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    res.cookie('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });

    return {
      message,
      refreshToken,
      accessToken,
      user,
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async forgotPassword(@Body() forgotPasswordDTO: any): Promise<any> {
    const payload = { ...forgotPasswordDTO };
    return await firstValueFrom(
      this.authClient.send(AUTH_SERVICE.ACTIONS.FORGOT_PASSWORD, payload),
    );
  }

  @Post('reset-password/:token')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async resetPassword(
    @Body() resetPasswordDTO: any,
    @Param('token') token: string,
  ): Promise<any> {
    const payload = { ...resetPasswordDTO, token };
    return await firstValueFrom(
      this.authClient.send(AUTH_SERVICE.ACTIONS.RESET_PASSWORD, payload),
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async refreshToken(
    @Body() refreshTokenDTO: any,
    @Res() res: Response,
  ): Promise<any> {
    const payload = { ...refreshTokenDTO };
    const { accessToken, refreshToken, user, message } = await firstValueFrom(
      this.authClient.send(AUTH_SERVICE.ACTIONS.REFRESH_TOKEN, payload),
    );

    res.cookie('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    res.cookie('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });

    return {
      message,
      refreshToken,
      accessToken,
      user,
    };
  }

  @Post('verify-email/:emailVerificationToken')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async verifyEmail(
    @Param('emailVerificationToken') emailVerificationToken: string,
  ): Promise<any> {
    return await firstValueFrom(
      this.authClient.send(
        AUTH_SERVICE.ACTIONS.VERIFY_EMAIL,
        emailVerificationToken,
      ),
    );
  }
}
