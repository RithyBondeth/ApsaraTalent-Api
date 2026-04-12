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
import { PAYMENT_SERVICE } from '@app/contracts/constants/service-actions/payment-service.constant';
import { IPaymentController } from '@app/contracts/interfaces/domain/payment.interface';
import {
  CheckPaymentBulkStatusResponse,
  CheckPaymentStatusResponse,
  DecodeKhqrResponse,
  GenerateDeepLinkResponse,
  GenerateIndividualKhqrResponse,
  GenerateMerchantKhqrResponse,
  VerifyKhqrResponse,
} from '@app/contracts/interfaces/domain/payment-response.interface';
import { GenerateIndividualKhqrDTO } from 'apps/payment-service/src/dtos/generate-individual-khqr.dto';
import { GenerateMerchantKhqrDTO } from 'apps/payment-service/src/dtos/generate-merchant-khqr.dto';
import { VerifyKhqrDTO } from 'apps/payment-service/src/dtos/verify-khqr.dto';
import { DecodeKhqrDTO } from 'apps/payment-service/src/dtos/decode-khqr.dto';
import { GenerateDeepLinkDTO } from 'apps/payment-service/src/dtos/generate-deeplink.dto';
import { CheckPaymentStatusDTO } from 'apps/payment-service/src/dtos/check-payment-status.dto';
import { CheckPaymentBulkStatusDTO } from 'apps/payment-service/src/dtos/check-payment-bulk-status.dto';

@Controller('bakong')
export class PaymentController implements IPaymentController {
  constructor(
    @Inject(PAYMENT_SERVICE.NAME) private readonly paymentClient: ClientProxy,
  ) {}

  @Post('generate-individual-khqr')
  async generateIndividualQr(
    @Body() generateIndividualQrDTO: GenerateIndividualKhqrDTO,
  ): Promise<GenerateIndividualKhqrResponse> {
    return firstValueFrom(
      this.paymentClient.send<GenerateIndividualKhqrResponse>(
        PAYMENT_SERVICE.ACTIONS.GENERATE_INDIVIDUAL_KHQR,
        generateIndividualQrDTO,
      ),
    );
  }

  @Post('generate-merchant-khqr')
  async generateMerchantQr(
    @Body() generateMerchantQrDTO: GenerateMerchantKhqrDTO,
  ): Promise<GenerateMerchantKhqrResponse> {
    return firstValueFrom(
      this.paymentClient.send<GenerateMerchantKhqrResponse>(
        PAYMENT_SERVICE.ACTIONS.GENERATE_MERCHANT_KHQR,
        generateMerchantQrDTO,
      ),
    );
  }

  @Post('verify-khqr')
  async verifyKhqr(@Body() verifyKhqrDTO: VerifyKhqrDTO): Promise<VerifyKhqrResponse> {
    return firstValueFrom(
      this.paymentClient.send<VerifyKhqrResponse>(
        PAYMENT_SERVICE.ACTIONS.VERIFY_KHQR,
        verifyKhqrDTO,
      ),
    );
  }

  @Post('decode-khqr')
  async decodeKhqr(@Body() decodeKhqrDTO: DecodeKhqrDTO): Promise<DecodeKhqrResponse> {
    return firstValueFrom(
      this.paymentClient.send<DecodeKhqrResponse>(
        PAYMENT_SERVICE.ACTIONS.DECODE_KHQR,
        decodeKhqrDTO,
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
  async generateDeepLink(
    @Body() generateDeepLinkDto: GenerateDeepLinkDTO,
  ): Promise<GenerateDeepLinkResponse> {
    return firstValueFrom(
      this.paymentClient.send<GenerateDeepLinkResponse>(
        PAYMENT_SERVICE.ACTIONS.GENERATE_DEEP_LINK,
        generateDeepLinkDto,
      ),
    );
  }

  @Post('payment/check-status')
  async checkPaymentStatus(
    @Body() checkPaymentStatusDTO: CheckPaymentStatusDTO,
  ): Promise<CheckPaymentStatusResponse> {
    return firstValueFrom(
      this.paymentClient.send<CheckPaymentStatusResponse>(
        PAYMENT_SERVICE.ACTIONS.CHECK_PAYMENT_STATUS,
        checkPaymentStatusDTO,
      ),
    );
  }

  @Post('payment/check-bulk-status')
  async checkPaymentBulkStatus(
    @Body() checkPaymentBulkStatusDTO: CheckPaymentBulkStatusDTO,
  ): Promise<CheckPaymentBulkStatusResponse> {
    return firstValueFrom(
      this.paymentClient.send<CheckPaymentBulkStatusResponse>(
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
