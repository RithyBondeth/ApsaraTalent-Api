import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { ClientProxy } from '@nestjs/microservices';
import { LinkedInAuthGuard } from '../guards/linkedin-auth.guard';
import { ILinkedInAuthController } from '@app/common/interfaces/auth-controller.interface';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('social')
export class LinkedInController implements ILinkedInAuthController {
  constructor(
    @Inject(AUTH_SERVICE.NAME) private readonly authService: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  @Get('linkedin/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LinkedInAuthGuard)
  async linkedInAuth() {}

  @Get('linkedin/callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LinkedInAuthGuard)
  async linkedInCallback(@Req() req: any, @Res() res: Response) {
    const linkedDataDTO = {
      id: req.user.id,
      email: req.user.emails?.[0]?.value ?? null,
      firstName: req.user.name?.givenName ?? null,
      lastName: req.user.name?.familyName ?? null,
      picture: req.user.photos?.[0]?.value ?? null,
      provider: req.user.provider ?? null,
    };

    const result = await firstValueFrom(
      this.authService.send(AUTH_SERVICE.ACTIONS.LINKEDIN_AUTH, linkedDataDTO),
    );

    const FRONTEND_ORIGIN =
      this.configService.get<string>('FRONTED_ORIGIN') ??
      'http://localhost:4000';

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
}
