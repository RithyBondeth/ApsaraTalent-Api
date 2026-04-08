import { IBasicAuthController } from '@app/contracts/interfaces/auth-controller.interface';
import { ThrottlerGuard } from '@app/common/throttler/guards/throttler.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Response } from 'express';
import { AUTH_SERVICE } from '@app/contracts/constants/auth-service.constant';
import { setAuthTokenCookies } from './utils/auth-cookie.util';
import { sendAuthServiceRequest } from './utils/auth-rpc.util';

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
    return await sendAuthServiceRequest(
      this.authClient,
      AUTH_SERVICE.ACTIONS.REGISTER_COMPANY,
      payload,
    );
  }

  @Post('register-employee')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  async registerEmployee(@Body() employeeRegisterDTO: any): Promise<any> {
    const payload = { ...employeeRegisterDTO };
    return await sendAuthServiceRequest(
      this.authClient,
      AUTH_SERVICE.ACTIONS.REGISTER_EMPLOYEE,
      payload,
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

    const { accessToken, refreshToken, user, message } =
      await sendAuthServiceRequest(
        this.authClient,
        AUTH_SERVICE.ACTIONS.LOGIN,
        payload,
      );

    // Mirror the issued tokens into cookies so browser clients can use cookie-
    // based auth while still receiving the raw tokens in the JSON response.
    setAuthTokenCookies(res, { accessToken, refreshToken });

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
    return await sendAuthServiceRequest(
      this.authClient,
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
    const response = await sendAuthServiceRequest(
      this.authClient,
      AUTH_SERVICE.ACTIONS.VERIFY_OTP,
      verifyOtpDTO,
    );

    const { accessToken, refreshToken, user, message } = response;

    // OTP login finishes with the same cookie contract as password login so
    // the frontend can treat both flows identically after verification.
    setAuthTokenCookies(res, { accessToken, refreshToken });

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
    return await sendAuthServiceRequest(
      this.authClient,
      AUTH_SERVICE.ACTIONS.FORGOT_PASSWORD,
      payload,
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
    return await sendAuthServiceRequest(
      this.authClient,
      AUTH_SERVICE.ACTIONS.RESET_PASSWORD,
      payload,
    );
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
      await sendAuthServiceRequest(
        this.authClient,
        AUTH_SERVICE.ACTIONS.REFRESH_TOKEN,
        payload,
      );

    // Refresh updates both cookies so subsequent browser requests continue to
    // carry the newest token pair without extra frontend coordination.
    setAuthTokenCookies(res, { accessToken, refreshToken });

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
    return await sendAuthServiceRequest(
      this.authClient,
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
      // Ask Twilio for short-lived TURN credentials. If that fails, callers can
      // still connect with public STUN servers for best-effort WebRTC setup.
      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString(
        'base64',
      );
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Tokens.json`,
        {
          method: 'POST',
          headers: { Authorization: `Basic ${credentials}` },
        },
      );
      const data = (await response.json()) as any;
      return { iceServers: data.ice_servers ?? fallback.iceServers };
    } catch {
      return fallback;
    }
  }
}
