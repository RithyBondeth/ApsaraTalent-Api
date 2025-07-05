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

@Controller('social')
export class LinkedInController implements ILinkedInAuthController {
  constructor(
    @Inject(AUTH_SERVICE.NAME) private readonly authService: ClientProxy,
  ) {}

  @Get('linkedin/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LinkedInAuthGuard)
  async linkedInAuth() {}

  @Get('linkedin/callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LinkedInAuthGuard)
  async linkedInCallback(@Req() req: any, @Res() res: Response) {
    console.log('🔐 LinkedIn user DTO:', req.user);

    const linkedDataDTO = {
      id: req.user.id,
      email: req.user.emails?.[0]?.value ?? null,
      firstName: req.user.name?.givenName ?? null,
      lastName: req.user.name?.familyName ?? null,
      picture: req.user.photos?.[0]?.value ?? null,
      provider: req.user.provider ?? null,
    };

    console.log("LinkedIn DTO: ", linkedDataDTO);

    try {
        const response = await firstValueFrom(
          this.authService.send(AUTH_SERVICE.ACTIONS.LINKEDIN_AUTH, linkedDataDTO),
        );
        return res.json(response);
      } catch (err) {
        console.error('❌ Auth service error:', err);
        return res.status(500).json({ message: 'LinkedIn auth failed' });
      }

    // try {
    //     const result = await firstValueFrom(
    //       this.authService.send(AUTH_SERVICE.ACTIONS.LINKEDIN_AUTH, linkedDataDTO),
    //     );
      
    //     const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:4000';
      
    //     const html = `
    //       <!doctype html>
    //       <html>
    //       <body>
    //         <script>
    //           (function () {
    //             const data = ${JSON.stringify(result)};
    //             const targetOrigin = "${FRONTEND_ORIGIN}";
      
    //             if (window.opener) {
    //               window.opener.postMessage(data, targetOrigin);
    //             }
      
    //             setTimeout(() => {
    //               window.close();
    //             }, 100);
    //           })();
    //         </script>
    //       </body>
    //       </html>`;
      
    //     res.setHeader('Content-Type', 'text/html');
    //     res.send(html);
      
    //   } catch (err) {
    //     console.error('❌ Error during LinkedIn auth callback:', {
    //       message: err?.message,
    //       code: err?.code,
    //       response: err?.response,
    //       cause: err?.cause,
    //       stack: err?.stack,
    //     });
      
    //     return res.status(500).json({
    //       message: 'LinkedIn authentication failed',
    //       error: err?.message || err,
    //     });
    //   }
  }
}
