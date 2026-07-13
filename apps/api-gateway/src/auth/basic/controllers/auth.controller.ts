import { IBasicAuthController } from '@app/contracts/interfaces/controller/auth-controller.interface';
import { ThrottlerGuard } from '@app/common/throttler/guards/throttler.guard';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@app/common/guards/auth.guard';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from 'express';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import { ResumeParseService } from '../../services/resume-parse.service';
import { IceServersService } from '../../services/ice-servers.service';
import {
  CompanyRegisterDTO,
  EmployeeRegisterDTO,
  LoginDTO,
  LoginOtpDTO,
  VerifyOtpDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  RefreshTokenDTO,
  LoginResponseDTO,
  LoginOtpResponseDTO,
  ForgotPasswordResponseDTO,
  ResetPasswordResponseDTO,
  RefreshTokenResponseDTO,
  VerifyEmailResponseDTO,
  CompanyRegisterResponseDTO,
  EmployeeRegisterResponseDTO,
  VerifyOtpResponseDTO,
  VerifyEmailDTO,
  TwoFactorSetupResponseDTO,
  TwoFactorEnableDTO,
  TwoFactorEnableResponseDTO,
  TwoFactorDisableDTO,
  TwoFactorDisableResponseDTO,
  TwoFactorVerifyLoginDTO,
  TwoFactorVerifyLoginResponseDTO,
} from '@app/contracts/dtos/auth';
import {
  clearAuthTokenCookies,
  setAuthTokenCookies,
} from '../../utils/auth-cookie.util';
import { sendAuthServiceRequest } from '../../utils/auth-rpc.util';
import { User } from '@app/common/database/entities/user.entity';
import { IParsedResumeData } from '@app/contracts';

@Controller('auth')
export class AuthController implements IBasicAuthController {
  constructor(
    @Inject(AUTH_SERVICE.NAME) private readonly authClient: ClientProxy,
    private readonly resumeParse: ResumeParseService,
    private readonly iceServersService: IceServersService,
  ) {}

  @Post('register-company')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  async registerCompany(
    @Body() companyRegisterDTO: CompanyRegisterDTO,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CompanyRegisterResponseDTO> {
    const response = await sendAuthServiceRequest<CompanyRegisterResponseDTO>(
      this.authClient,
      AUTH_SERVICE.ACTIONS.REGISTER_COMPANY,
      companyRegisterDTO,
    );
    setAuthTokenCookies(res, {
      accessToken: response.accessToken!,
      refreshToken: response.refreshToken,
    });
    return new CompanyRegisterResponseDTO({
      message: response.message,
      user: response.user,
    });
  }

  @Post('register-employee')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  async registerEmployee(
    @Body() employeeRegisterDTO: EmployeeRegisterDTO,
    @Res({ passthrough: true }) res: Response,
  ): Promise<EmployeeRegisterResponseDTO> {
    const response = await sendAuthServiceRequest<EmployeeRegisterResponseDTO>(
      this.authClient,
      AUTH_SERVICE.ACTIONS.REGISTER_EMPLOYEE,
      employeeRegisterDTO,
    );
    setAuthTokenCookies(res, {
      accessToken: response.accessToken!,
      refreshToken: response.refreshToken,
    });
    return new EmployeeRegisterResponseDTO({
      message: response.message,
      user: response.user,
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async login(
    @Body() loginDTO: LoginDTO,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDTO> {
    const response = await sendAuthServiceRequest<LoginResponseDTO>(
      this.authClient,
      AUTH_SERVICE.ACTIONS.LOGIN,
      loginDTO,
    );

    if (response.requiresTwoFactor) {
      return new LoginResponseDTO({
        message: response.message,
        requiresTwoFactor: true,
        userId: response.userId,
      });
    }

    setAuthTokenCookies(res, {
      accessToken: response.accessToken!,
      refreshToken: response.refreshToken,
    });

    return new LoginResponseDTO({
      message: response.message,
      user: response.user,
    });
  }

  @Post('login-otp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async loginOtp(
    @Body() loginOtpDTO: LoginOtpDTO,
  ): Promise<LoginOtpResponseDTO> {
    return await sendAuthServiceRequest<LoginOtpResponseDTO>(
      this.authClient,
      AUTH_SERVICE.ACTIONS.LOGIN_OTP,
      loginOtpDTO,
    );
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async verifyOtp(
    @Body() verifyOtpDTO: VerifyOtpDTO,
    @Res({ passthrough: true }) res: Response,
  ): Promise<VerifyOtpResponseDTO> {
    const response = await sendAuthServiceRequest<VerifyOtpResponseDTO>(
      this.authClient,
      AUTH_SERVICE.ACTIONS.VERIFY_OTP,
      verifyOtpDTO,
    );

    const { message, accessToken, refreshToken, user } = response;

    setAuthTokenCookies(res, { accessToken, refreshToken });

    return new VerifyOtpResponseDTO({
      message,
      user,
    });
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async forgotPassword(
    @Body() forgotPasswordDTO: ForgotPasswordDTO,
  ): Promise<ForgotPasswordResponseDTO> {
    return await sendAuthServiceRequest<ForgotPasswordResponseDTO>(
      this.authClient,
      AUTH_SERVICE.ACTIONS.FORGOT_PASSWORD,
      forgotPasswordDTO,
    );
  }

  @Post('reset-password/:token')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async resetPassword(
    @Body() resetPasswordDTO: ResetPasswordDTO,
    @Param('token') token: string,
  ): Promise<ResetPasswordResponseDTO> {
    const payload = { ...resetPasswordDTO, token };
    return await sendAuthServiceRequest<ResetPasswordResponseDTO>(
      this.authClient,
      AUTH_SERVICE.ACTIONS.RESET_PASSWORD,
      payload,
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshTokenResponseDTO> {
    const refreshTokenFromCookie = req.cookies?.['refresh-token'];
    if (!refreshTokenFromCookie) {
      throw new BadRequestException('No refresh token provided');
    }

    const { accessToken, refreshToken, user, message } =
      await sendAuthServiceRequest<RefreshTokenResponseDTO>(
        this.authClient,
        AUTH_SERVICE.ACTIONS.REFRESH_TOKEN,
        new RefreshTokenDTO({ refreshToken: refreshTokenFromCookie }),
      );

    setAuthTokenCookies(res, { accessToken, refreshToken });

    return new RefreshTokenResponseDTO({
      message,
      user,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response): { message: string } {
    clearAuthTokenCookies(res);
    return { message: 'Logged out successfully' };
  }

  @Post('verify-email/:emailVerificationToken')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async verifyEmail(
    @Param('emailVerificationToken') emailVerificationToken: VerifyEmailDTO,
  ): Promise<VerifyEmailResponseDTO> {
    return await sendAuthServiceRequest<VerifyEmailResponseDTO>(
      this.authClient,
      AUTH_SERVICE.ACTIONS.VERIFY_EMAIL,
      emailVerificationToken,
    );
  }

  /** Initiate 2FA setup — Generates TOTP secret and QR code URI. Requires auth. */
  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async twoFactorSetup(
    @Req() req: Request,
  ): Promise<TwoFactorSetupResponseDTO> {
    const user = req.user as User;
    return await sendAuthServiceRequest<TwoFactorSetupResponseDTO>(
      this.authClient,
      AUTH_SERVICE.ACTIONS.TWO_FACTOR_SETUP,
      { userId: user.id },
    );
  }

  /** Confirm TOTP code and activate 2FA on the account. Requires auth. */
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async twoFactorEnable(
    @Req() req: Request,
    @Body() twoFactorEnableDTO: Pick<TwoFactorEnableDTO, 'otp'>,
  ): Promise<TwoFactorEnableResponseDTO> {
    const user = req.user as User;
    return await sendAuthServiceRequest<TwoFactorEnableResponseDTO>(
      this.authClient,
      AUTH_SERVICE.ACTIONS.TWO_FACTOR_ENABLE,
      { userId: user.id, otp: twoFactorEnableDTO.otp },
    );
  }

  /** Verify TOTP code and disable 2FA on the account. Requires auth. */
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async twoFactorDisable(
    @Req() req: Request,
    @Body() twoFactorDisableDTO: Pick<TwoFactorDisableDTO, 'otp'>,
  ): Promise<TwoFactorDisableResponseDTO> {
    const user = req.user as User;
    return await sendAuthServiceRequest<TwoFactorDisableResponseDTO>(
      this.authClient,
      AUTH_SERVICE.ACTIONS.TWO_FACTOR_DISABLE,
      { userId: user.id, otp: twoFactorDisableDTO.otp },
    );
  }

  /** Verify TOTP code after password login when 2FA is required. Public route. */
  @Post('2fa/verify-login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async twoFactorVerifyLogin(
    @Body() twoFactorVerifyLoginDTO: TwoFactorVerifyLoginDTO,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TwoFactorVerifyLoginResponseDTO> {
    const response =
      await sendAuthServiceRequest<TwoFactorVerifyLoginResponseDTO>(
        this.authClient,
        AUTH_SERVICE.ACTIONS.TWO_FACTOR_VERIFY_LOGIN,
        twoFactorVerifyLoginDTO,
      );
    setAuthTokenCookies(res, {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    });
    return new TwoFactorVerifyLoginResponseDTO({
      message: response.message,
      user: response.user,
    });
  }

  @Post('parse-resume')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(
            new BadRequestException('Only PDF files are accepted.'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async parseResume(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<IParsedResumeData> {
    if (!file) throw new BadRequestException('No resume file received.');
    return this.resumeParse.parseResume(file.buffer, file.mimetype);
  }

  /** Returns Twilio TURN credentials for WebRTC peer connections. */
  @Get('ice-servers')
  @HttpCode(HttpStatus.OK)
  async getIceServers(): Promise<{ iceServers: object[] }> {
    return this.iceServersService.getIceServers();
  }
}
