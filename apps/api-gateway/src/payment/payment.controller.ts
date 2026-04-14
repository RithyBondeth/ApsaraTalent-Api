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
import { PAYMENT_SERVICE } from '@app/contracts/constants/service-actions/payment-service.constant';
import { IPaymentController } from '@app/contracts/interfaces/domain/payment.interface';
import {
  CheckPaymentBulkStatusResponseDTODTO,
  CheckPaymentStatusResponseDTODTO,
  DecodeKhqrResponseDTODTO,
  GenerateDeepLinkResponseDTODTO,
  GenerateIndividualKhqrResponseDTODTO,
  GenerateMerchantKhqrResponseDTODTO,
  VerifyKhqrResponseDTODTO,
  GenerateIndividualKhqrDTO,
  GenerateMerchantKhqrDTO,
  VerifyKhqrDTO,
  DecodeKhqrDTO,
  GenerateDeepLinkDTO,
  CheckPaymentStatusDTO,
  CheckPaymentBulkStatusDTO,
  QrImageResponseDTO,
  Md5HashResponseDTO,
  PaymentInfoResponseDTO,
  KhqrInfoResponseDTO,
} from '@app/contracts/dtos/payment';
import { rpcCall } from '../utils/rpc-call';

@Controller('bakong')
export class PaymentController implements IPaymentController {
  constructor(
    @Inject(PAYMENT_SERVICE.NAME) private readonly paymentClient: ClientProxy,
  ) {}

  @Post('generate-individual-khqr')
  async generateIndividualQr(
    @Body() generateIndividualQrDTO: GenerateIndividualKhqrDTO,
  ): Promise<GenerateIndividualKhqrResponseDTO> {
    return rpcCall<GenerateIndividualKhqrResponseDTO>(
      this.paymentClient,
      PAYMENT_SERVICE.ACTIONS.GENERATE_INDIVIDUAL_KHQR,
      generateIndividualQrDTO,
    );
  }

  @Post('generate-merchant-khqr')
  async generateMerchantQr(
    @Body() generateMerchantQrDTO: GenerateMerchantKhqrDTO,
  ): Promise<GenerateMerchantKhqrResponseDTO> {
    return rpcCall<GenerateMerchantKhqrResponseDTO>(
      this.paymentClient,
      PAYMENT_SERVICE.ACTIONS.GENERATE_MERCHANT_KHQR,
      generateMerchantQrDTO,
    );
  }

  @Post('verify-khqr')
  async verifyKhqr(
    @Body() verifyKhqrDTO: VerifyKhqrDTO,
  ): Promise<VerifyKhqrResponseDTO> {
    return rpcCall<VerifyKhqrResponseDTO>(
      this.paymentClient,
      PAYMENT_SERVICE.ACTIONS.VERIFY_KHQR,
      verifyKhqrDTO,
    );
  }

  @Post('decode-khqr')
  async decodeKhqr(
    @Body() decodeKhqrDTO: DecodeKhqrDTO,
  ): Promise<DecodeKhqrResponseDTO> {
    return rpcCall<DecodeKhqrResponseDTO>(
      this.paymentClient,
      PAYMENT_SERVICE.ACTIONS.DECODE_KHQR,
      decodeKhqrDTO,
    );
  }

  @Post('generate-qr-image')
  async generateQRImage(
    @Body() body: { qrString: string; width?: number; margin?: number },
    @Query('format') format: 'base64' | 'url' = 'base64',
  ): Promise<QrImageResponseDTO> {
    return rpcCall(this.paymentClient, PAYMENT_SERVICE.ACTIONS.KHQR_GENERATE, {
      body,
      format,
    });
  }

  @Post('generate-deep-link')
  async generateDeepLink(
    @Body() generateDeepLinkDto: GenerateDeepLinkDTO,
  ): Promise<GenerateDeepLinkResponseDTO> {
    return rpcCall<GenerateDeepLinkResponseDTO>(
      this.paymentClient,
      PAYMENT_SERVICE.ACTIONS.GENERATE_DEEP_LINK,
      generateDeepLinkDto,
    );
  }

  @Post('payment/check-status')
  async checkPaymentStatus(
    @Body() checkPaymentStatusDTO: CheckPaymentStatusDTO,
  ): Promise<CheckPaymentStatusResponseDTO> {
    return rpcCall<CheckPaymentStatusResponseDTO>(
      this.paymentClient,
      PAYMENT_SERVICE.ACTIONS.CHECK_PAYMENT_STATUS,
      checkPaymentStatusDTO,
    );
  }

  @Post('payment/check-bulk-status')
  async checkPaymentBulkStatus(
    @Body() checkPaymentBulkStatusDTO: CheckPaymentBulkStatusDTO,
  ): Promise<CheckPaymentBulkStatusResponseDTO> {
    return rpcCall<CheckPaymentBulkStatusResponseDTO>(
      this.paymentClient,
      PAYMENT_SERVICE.ACTIONS.CHECK_PAYMENT_BULK_STATUS,
      checkPaymentBulkStatusDTO,
    );
  }

  @Get('payment-info/:md5Hash')
  async getPaymentInfo(@Param('md5Hash') md5Hash: string): Promise<PaymentInfoResponseDTO> {
    return rpcCall(
      this.paymentClient,
      PAYMENT_SERVICE.ACTIONS.GET_PAYMENT_INFO,
      md5Hash,
    );
  }

  @Get('khqr-info/:qrString')
  async getKHQRInfo(@Param('qrString') qrString: string): Promise<KhqrInfoResponseDTO> {
    return rpcCall(
      this.paymentClient,
      PAYMENT_SERVICE.ACTIONS.GET_KHQR_INFO,
      decodeURIComponent(qrString),
    );
  }

  @Post('generate-md5')
  async generateMd5Hash(@Body() body: { data: string }): Promise<Md5HashResponseDTO> {
    return rpcCall(
      this.paymentClient,
      PAYMENT_SERVICE.ACTIONS.GENERATE_MD5_HASH,
      body,
    );
  }
}
