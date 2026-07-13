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
import { IPaymentController } from '@app/contracts/interfaces/controller/payment-controller.interface';
import {
  CheckPaymentBulkStatusResponseDTO,
  CheckPaymentStatusResponseDTO,
  DecodeKhqrResponseDTO,
  GenerateDeepLinkResponseDTO,
  GenerateIndividualKhqrResponseDTO,
  GenerateMerchantKhqrResponseDTO,
  VerifyKhqrResponseDTO,
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
  GenerateQrImageDTO,
  GenerateQrImageQueryDTO,
  PaymentInfoLookupDTO,
  KhqrInfoLookupDTO,
  GenerateMd5HashDTO,
} from '@app/contracts/dtos/payment';
import { rpcCall } from '../../utils/rpc-call';

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
    @Body() generateQrImageDTO: GenerateQrImageDTO,
    @Query('format') format: GenerateQrImageQueryDTO['format'],
  ): Promise<QrImageResponseDTO> {
    return rpcCall<QrImageResponseDTO>(
      this.paymentClient,
      PAYMENT_SERVICE.ACTIONS.KHQR_GENERATE,
      {
        body: generateQrImageDTO,
        format,
      },
    );
  }

  @Post('generate-deep-link')
  async generateDeepLink(
    @Body() generateDeepLinkDTO: GenerateDeepLinkDTO,
  ): Promise<GenerateDeepLinkResponseDTO> {
    return rpcCall<GenerateDeepLinkResponseDTO>(
      this.paymentClient,
      PAYMENT_SERVICE.ACTIONS.GENERATE_DEEP_LINK,
      generateDeepLinkDTO,
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
  async getPaymentInfo(
    @Param('md5Hash') md5Hash: PaymentInfoLookupDTO['md5Hash'],
  ): Promise<PaymentInfoResponseDTO> {
    return rpcCall<PaymentInfoResponseDTO>(
      this.paymentClient,
      PAYMENT_SERVICE.ACTIONS.GET_PAYMENT_INFO,
      md5Hash,
    );
  }

  @Get('khqr-info/:qrString')
  async getKHQRInfo(
    @Param('qrString') qrString: KhqrInfoLookupDTO['qrString'],
  ): Promise<KhqrInfoResponseDTO> {
    return rpcCall<KhqrInfoResponseDTO>(
      this.paymentClient,
      PAYMENT_SERVICE.ACTIONS.GET_KHQR_INFO,
      decodeURIComponent(qrString),
    );
  }

  @Post('generate-md5')
  async generateMd5Hash(
    @Body() generateMd5HashDTO: GenerateMd5HashDTO,
  ): Promise<Md5HashResponseDTO> {
    return rpcCall<Md5HashResponseDTO>(
      this.paymentClient,
      PAYMENT_SERVICE.ACTIONS.GENERATE_MD5_HASH,
      generateMd5HashDTO,
    );
  }
}
