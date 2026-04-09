import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PAYMENT_SERVICE } from '@app/contracts/constants/payment-service.constant';
import { RateLimit } from './decorators/rate-limit.decorator';
import { CheckPaymentBulkStatusDTO } from './dtos/check-payment-bulk-status.dto';
import { CheckPaymentStatusDTO } from './dtos/check-payment-status.dto';
import { DecodeKhqrDTO } from './dtos/decode-khqr.dto';
import { GenerateDeepLinkDTO } from './dtos/generate-deeplink.dto';
import { GenerateIndividualKhqrDTO } from './dtos/generate-individual-khqr.dto';
import { GenerateMerchantKhqrDTO } from './dtos/generate-merchant-khqr.dto';
import { VerifyKhqrDTO } from './dtos/verify-khqr.dto';

import { IPaymentController } from '@app/contracts/interfaces/payment.interface';
import {
  I_PAYMENT_SERVICE,
  IPaymentService,
} from '@app/contracts/interfaces/payment-service.interface';

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
  ): Promise<any> {
    return this.paymentService.generateIndividualKhqrDTO(
      generateIndividualKhqrDTO,
    );
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.GENERATE_MERCHANT_KHQR)
  @RateLimit(50) // Lower limit for QR generation
  async generateMerchantQr(
    @Payload() generateMerchantKhqrDTO: GenerateMerchantKhqrDTO,
  ): Promise<any> {
    return this.paymentService.generateMerchantKhqrDTO(
      generateMerchantKhqrDTO,
    );
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.VERIFY_KHQR)
  async verifyKhqr(@Payload() verifyKhqrDTO: VerifyKhqrDTO): Promise<any> {
    return this.paymentService.verifyKhqr(verifyKhqrDTO);
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.DECODE_KHQR)
  async decodeKhqr(@Payload() decodeKhqrDTO: DecodeKhqrDTO): Promise<any> {
    return this.paymentService.decodeKhqr(decodeKhqrDTO);
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.GENERATE_DEEP_LINK)
  async generateDeepLink(
    @Payload() generateDeepLinkDTO: GenerateDeepLinkDTO,
  ): Promise<any> {
    return this.paymentService.generateDeepLink(generateDeepLinkDTO);
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.CHECK_PAYMENT_STATUS)
  async checkPaymentStatus(
    @Payload() checkPaymentStatusDTO: CheckPaymentStatusDTO,
  ): Promise<any> {
    return this.paymentService.checkPaymentStatus(checkPaymentStatusDTO);
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.CHECK_PAYMENT_BULK_STATUS)
  async checkPaymentBulkStatus(
    @Payload() checkPaymentBulkStatusDTO: CheckPaymentBulkStatusDTO,
  ): Promise<any> {
    return this.paymentService.checkPaymentBulkStatus(
      checkPaymentBulkStatusDTO,
    );
  }
}
