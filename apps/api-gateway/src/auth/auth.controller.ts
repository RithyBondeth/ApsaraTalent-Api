import { IBasicAuthController } from '@app/common/interfaces/auth-controller.interface';
import { ThrottlerGuard } from '@app/common/throttler/guards/throttler.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';

@Controller('auth')
export class AuthController implements IBasicAuthController {
  constructor(
    @Inject(AUTH_SERVICE.NAME) private readonly authClient: ClientProxy,
  ) {}

  private normalizeErrorPayload(error: unknown): {
    statusCode: number;
    message: string;
  } {
    const fallback = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };

    if (!error || typeof error !== 'object') return fallback;

    const err = error as Record<string, unknown>;
    const candidates: unknown[] = [err, err.response, err.error, err.cause];

    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'object') continue;
      const payload = candidate as Record<string, unknown>;
      const rawStatus = payload.statusCode;
      const rawMessage = payload.message;
      const statusCode =
        typeof rawStatus === 'number' && rawStatus >= 100 && rawStatus <= 599
          ? rawStatus
          : null;

      const message =
        typeof rawMessage === 'string'
          ? rawMessage
          : Array.isArray(rawMessage)
            ? rawMessage.find((item) => typeof item === 'string')
            : null;

      if (statusCode || message) {
        return {
          statusCode: statusCode ?? fallback.statusCode,
          message: message ?? fallback.message,
        };
      }
    }

    // Some RPC errors bubble up as a JSON string in error.message.
    if (typeof err.message === 'string') {
      try {
        const parsed = JSON.parse(err.message) as Record<string, unknown>;
        const parsedStatus = parsed.statusCode;
        const parsedMessage = parsed.message;
        if (typeof parsedStatus === 'number' && typeof parsedMessage === 'string') {
          return { statusCode: parsedStatus, message: parsedMessage };
        }
      } catch {
        // ignore JSON parse failures and fall back below
      }
    }

    return fallback;
  }

  private rethrowAsHttpError(error: unknown): never {
    const normalized = this.normalizeErrorPayload(error);
    throw new HttpException(normalized.message, normalized.statusCode);
  }

  private async sendAuthRequest<T = any>(
    action: unknown,
    payload: unknown,
  ): Promise<T> {
    try {
      return await firstValueFrom(this.authClient.send<T>(action, payload));
    } catch (error) {
      this.rethrowAsHttpError(error);
    }
  }

  @Post('register-company')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  async registerCompany(@Body() companyRegisterDTO: any): Promise<any> {
    const payload = { ...companyRegisterDTO };
    return await this.sendAuthRequest(AUTH_SERVICE.ACTIONS.REGISTER_COMPANY, payload);
  }

  @Post('register-employee')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  async registerEmployee(@Body() employeeRegisterDTO: any): Promise<any> {
    const payload = { ...employeeRegisterDTO };
    return await this.sendAuthRequest(AUTH_SERVICE.ACTIONS.REGISTER_EMPLOYEE, payload);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async login(
    @Body() loginDTO: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    const payload = { ...loginDTO };

    const { accessToken, refreshToken, user, message } =
      await this.sendAuthRequest(
        AUTH_SERVICE.ACTIONS.LOGIN,
        payload,
      );

    // Set HTTP-only cookies
    res.cookie('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'none',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    res.cookie('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'none',
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
    return await this.sendAuthRequest(
      AUTH_SERVICE.ACTIONS.LOGIN_OTP,
      loginOtpDTO,
    );
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async verifyOtp(
    @Body() verifyOtpDTO: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    const response = await this.sendAuthRequest(
      AUTH_SERVICE.ACTIONS.VERIFY_OTP,
      verifyOtpDTO,
    );

    const { accessToken, refreshToken, user, message } = response;

    res.cookie('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'none',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    res.cookie('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'none',
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
    return await this.sendAuthRequest(AUTH_SERVICE.ACTIONS.FORGOT_PASSWORD, payload);
  }

  @Post('reset-password/:token')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async resetPassword(
    @Body() resetPasswordDTO: any,
    @Param('token') token: string,
  ): Promise<any> {
    const payload = { ...resetPasswordDTO, token };
    return await this.sendAuthRequest(AUTH_SERVICE.ACTIONS.RESET_PASSWORD, payload);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async refreshToken(
    @Body() refreshTokenDTO: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    const payload = { ...refreshTokenDTO };
    const { accessToken, refreshToken, user, message } =
      await this.sendAuthRequest(
        AUTH_SERVICE.ACTIONS.REFRESH_TOKEN,
        payload,
      );

    res.cookie('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'none',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    res.cookie('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'none',
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
    return await this.sendAuthRequest(
      AUTH_SERVICE.ACTIONS.VERIFY_EMAIL,
      emailVerificationToken,
    );
  }

  /** Returns Twilio TURN credentials for WebRTC peer connections. */
  @Get('ice-servers')
  @HttpCode(HttpStatus.OK)
  async getIceServers(): Promise<{ iceServers: object[] }> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fallback = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    if (!accountSid || !authToken) return fallback;

    try {
      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Tokens.json`,
        {
          method: 'POST',
          headers: { Authorization: `Basic ${credentials}` },
        },
      );
      const data = await response.json() as any;
      return { iceServers: data.ice_servers ?? fallback.iceServers };
    } catch {
      return fallback;
    }
  }
}
