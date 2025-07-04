import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { firstValueFrom } from 'rxjs';
import { IGoogleAuthController } from '@app/common/interfaces/auth-controller.interface';
import { Response } from 'express';

@Controller('social')
export class GoogleController implements IGoogleAuthController {
  constructor(
    @Inject(AUTH_SERVICE.NAME) private readonly authService: ClientProxy,
  ) {}

  @Get('google/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {}

  @Get('google/callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const result = await firstValueFrom(
      this.authService.send(AUTH_SERVICE.ACTIONS.GOOGLE_AUTH, req.user),
    );

    // Which front-end origin is allowed to receive the message?
    const FRONTEND_ORIGIN =
      process.env.FRONTEND_ORIGIN ?? 'http://localhost:4000';

    // const html = `
    // <!doctype html>
    // <html>
    //   <body>
    //     <script>
    //       // 🚀 hand data to the opener window
    //       window.opener &&
    //       window.opener.postMessage(${JSON.stringify(result)}, "${FRONTEND_ORIGIN}");
    //       // close the popup
    //       window.close();
    //     </script>
    //   </body>
    // </html>`;

    const html = `
        <!doctype html>
        <html>
        <body>
            <script>
            (function () {
                const data = ${JSON.stringify(result)};
                const targetOrigin = "${FRONTEND_ORIGIN}";

                // Send data to opener
                if (window.opener) {
                window.opener.postMessage(data, targetOrigin);
                }

                // Slight delay before closing to avoid COOP warnings
                setTimeout(() => {
                window.close();
                }, 100);
            })();
            </script>
        </body>
        </html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  @Post('register-google-user')
  async registerGoogleUser(@Body() registerData: any) {
    const payload = { ...registerData };
    return firstValueFrom(
      this.authService.send(AUTH_SERVICE.ACTIONS.GOOGLE_REGISTER_USER, payload),
    );
  }
}
