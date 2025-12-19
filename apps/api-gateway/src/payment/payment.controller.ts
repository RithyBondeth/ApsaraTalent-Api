import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { PAYMENT_SERVICE } from 'utils/constants/payment-service.constant';

@Controller('bakong')
export class PaymentController {
  constructor(
    @Inject(PAYMENT_SERVICE.NAME) private readonly paymentClient: ClientProxy,
  ) {}

  @Post('generate-individual-khqr')
  async generateIndividualQr(
    @Body() generateIndividualQrDTO: any,
  ): Promise<any> {
    return firstValueFrom(
      this.paymentClient.send(
        PAYMENT_SERVICE.ACTIONS.GENERATE_INDIVIDUAL_KHQR,
        generateIndividualQrDTO,
      )
    );
    // return firstValueFrom(
    //   this.paymentClient.send(
    //     PAYMENT_SERVICE.ACTIONS.GENERATE_INDIVIDUAL_KHQR,
    //     generateIndividualQrDTO,
    //   ),
    // );
  }

  @Post('generate-merchant-khqr')
  async generateMerchantQr(@Body() generateMerchantQrDTO: any): Promise<any> {
    // return firstValueFrom(
    //   this.paymentClient.send(
    //     PAYMENT_SERVICE.ACTIONS.GENERATE_MERCHANT_KHQR,
    //     generateMerchantQrDTO,
    //   ),
    // );
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

  @Post('generate-qr-image')
  async generateQRImage(
    @Body() body: { qrString: string; width?: number; margin?: number },
    @Query('format') format: 'base64' | 'url' = 'base64',
  ): Promise<any> {
    const payload = { body, format };
    return firstValueFrom(
      this.paymentClient.send(PAYMENT_SERVICE.ACTIONS.KHQR_GENERATE, payload),
    );
  }

  @Post('generate-deep-link')
  async generateDeepLink(@Body() generateDeepLinkDto: any): Promise<any> {
    return firstValueFrom(
      this.paymentClient.send(
        PAYMENT_SERVICE.ACTIONS.GENERATE_DEEP_LINK,
        generateDeepLinkDto,
      ),
    );
  }

  @Post('payment/check-status')
  async checkPaymentStatus(@Body() checkPaymentStatusDTO: any): Promise<any> {
    return firstValueFrom(
      this.paymentClient.send(
        PAYMENT_SERVICE.ACTIONS.CHECK_PAYMENT_STATUS,
        checkPaymentStatusDTO,
      ),
    );
  }

  @Post('payment/check-bulk-status')
  async checkPaymentBulkStatus(
    @Body() checkPaymentBulkStatusDTO: any,
  ): Promise<any> {
    return firstValueFrom(
      this.paymentClient.send(
        PAYMENT_SERVICE.ACTIONS.CHECK_PAYMENT_BULK_STATUS,
        checkPaymentBulkStatusDTO,
      ),
    );
  }

  @Get('payment-info/:md5Hash')
  async getPaymentInfo(@Param('md5Hash') md5Hash: string): Promise<any> {
    return firstValueFrom(
      this.paymentClient.send(
        PAYMENT_SERVICE.ACTIONS.GET_PAYMENT_INFO,
        md5Hash,
      ),
    );
  }

  @Get('khqr-info/:qrString')
  async getKHQRInfo(@Param('qrString') qrString: string): Promise<any> {
    const decodedQRString = decodeURIComponent(qrString);
    return firstValueFrom(
      this.paymentClient.send(
        PAYMENT_SERVICE.ACTIONS.GET_KHQR_INFO,
        decodedQRString,
      ),
    );
  }

  @Post('generate-md5')
  async generateMd5Hash(@Body() body: { data: string }): Promise<any> {
    return firstValueFrom(
      this.paymentClient.send(PAYMENT_SERVICE.ACTIONS.GENERATE_MD5_HASH, body),
    );
  }
}
