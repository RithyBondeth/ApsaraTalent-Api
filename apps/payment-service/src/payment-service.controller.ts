import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PAYMENT_SERVICE } from '@app/contracts/constants/service-actions/payment-service.constant';
import { RateLimit } from './decorators/rate-limit.decorator';
import {
  CheckPaymentBulkStatusDTO,
  CheckPaymentStatusDTO,
  DecodeKhqrDTO,
  GenerateDeepLinkDTO,
  GenerateIndividualKhqrDTO,
  GenerateMerchantKhqrDTO,
  VerifyKhqrDTO,
} from '@app/contracts/dtos/payment';

import { IPaymentController } from '@app/contracts/interfaces/domain/payment.interface';
import {
  I_PAYMENT_SERVICE,
  IPaymentService,
} from '@app/contracts/interfaces/service/payment-service.interface';
import {
  CheckPaymentBulkStatusResponse,
  CheckPaymentStatusResponse,
  DecodeKhqrResponse,
  GenerateDeepLinkResponse,
  GenerateIndividualKhqrResponse,
  GenerateMerchantKhqrResponse,
  VerifyKhqrResponse,
} from '@app/contracts/interfaces/domain/payment-response.interface';

@Controller()
export class PaymentController implements IPaymentController {
  constructor(
    @Inject(I_PAYMENT_SERVICE)
    private readonly paymentService: IPaymentService,
  ) {}

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.GENERATE_INDIVIDUAL_KHQR)
  @RateLimit(50) // Lower limit for QR generation
  async generateIndividualQr(
    @Payload() generateIndividualKhqrDTO: GenerateIndividualKhqrDTO,
  ): Promise<GenerateIndividualKhqrResponse> {
    return this.paymentService.generateIndividualKhqrDTO(
      generateIndividualKhqrDTO,
    );
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.GENERATE_MERCHANT_KHQR)
  @RateLimit(50) // Lower limit for QR generation
  async generateMerchantQr(
    @Payload() generateMerchantKhqrDTO: GenerateMerchantKhqrDTO,
  ): Promise<GenerateMerchantKhqrResponse> {
    return this.paymentService.generateMerchantKhqrDTO(generateMerchantKhqrDTO);
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.VERIFY_KHQR)
  async verifyKhqr(
    @Payload() verifyKhqrDTO: VerifyKhqrDTO,
  ): Promise<VerifyKhqrResponse> {
    return this.paymentService.verifyKhqr(verifyKhqrDTO);
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.DECODE_KHQR)
  async decodeKhqr(
    @Payload() decodeKhqrDTO: DecodeKhqrDTO,
  ): Promise<DecodeKhqrResponse> {
    return this.paymentService.decodeKhqr(decodeKhqrDTO);
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.GENERATE_DEEP_LINK)
  async generateDeepLink(
    @Payload() generateDeepLinkDTO: GenerateDeepLinkDTO,
  ): Promise<GenerateDeepLinkResponse> {
    return this.paymentService.generateDeepLink(generateDeepLinkDTO);
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.CHECK_PAYMENT_STATUS)
  async checkPaymentStatus(
    @Payload() checkPaymentStatusDTO: CheckPaymentStatusDTO,
  ): Promise<CheckPaymentStatusResponse> {
    return this.paymentService.checkPaymentStatus(checkPaymentStatusDTO);
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.CHECK_PAYMENT_BULK_STATUS)
  async checkPaymentBulkStatus(
    @Payload() checkPaymentBulkStatusDTO: CheckPaymentBulkStatusDTO,
  ): Promise<CheckPaymentBulkStatusResponse> {
    return this.paymentService.checkPaymentBulkStatus(
      checkPaymentBulkStatusDTO,
    );
  }
}
