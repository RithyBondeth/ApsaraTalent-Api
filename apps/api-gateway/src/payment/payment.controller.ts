import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { PAYMENT_SERVICE } from 'utils/constants/payment-service.constant';

@Controller('payment/bakong')
export class PaymentController {
  constructor(
    @Inject(PAYMENT_SERVICE.NAME) private readonly paymentClient: ClientProxy,
  ) {}

  @Post('individual/generate')
  async generateIndividualQr(
    @Body() generateIndividualQrDTO: any,
  ): Promise<any> {
    return firstValueFrom(
      this.paymentClient.send(
        PAYMENT_SERVICE.ACTIONS.INDIVIDUAL_GENERATE,
        generateIndividualQrDTO,
      ),
    );
  }

  @Post('merchant/generate')
  async generateMerchantQr(@Body() generateMerchantQrDTO: any): Promise<any> {
    return firstValueFrom(
      this.paymentClient.send(
        PAYMENT_SERVICE.ACTIONS.MERCHANT_GENERATE,
        generateMerchantQrDTO,
      ),
    );
  }

  @Post('verify-khqr')
  async verifyKHQR(@Body() verifyKhqrDTO: any): Promise<any> {
    return firstValueFrom(
      this.paymentClient.send(
        PAYMENT_SERVICE.ACTIONS.VERIFY_KHQR,
        verifyKhqrDTO,
      ),
    );
  }

  @Post('decode-khqr')
  async decodeKHQR(@Body() verifyKhqrDTO: any): Promise<any> {
    return firstValueFrom(
      this.paymentClient.send(
        PAYMENT_SERVICE.ACTIONS.DECODE_KHQR,
        verifyKhqrDTO,
      ),
    );
  }

  @Get('qr-image/:qrString')
  async getQrImage(@Param('qrString') qrString: string): Promise<any> {
    return firstValueFrom(
      this.paymentClient.send(PAYMENT_SERVICE.ACTIONS.GET_QR_IMAGE, qrString),
    );
  }
}
