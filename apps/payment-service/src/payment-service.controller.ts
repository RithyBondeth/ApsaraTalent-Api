import { Controller } from '@nestjs/common';
import { PaymentServiceService } from './payment-service.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PAYMENT_SERVICE } from 'utils/constants/payment-service.constant';
import { GenerateIndividualKhqrDTO } from './dtos/generate-individual-khqr.dto';
import { GenerateMerchantKhqrDTO } from './dtos/generate-merchant-khqr.dto';
import { VerifyKhqrDTO } from './dtos/verify-khqr.dto';
import { DecodeKhqrDTO } from './dtos/decode-khqr.dto';
import { GenerateDeepLinkDTO } from './dtos/generate-deeplink.dto';
import { CheckPaymentStatusDTO } from './dtos/check-payment-status.dto';
import { CheckPaymentBulkStatusDTO } from './dtos/check-payment-bulk-status.dto';

@Controller()
export class PaymentServiceController {
  constructor(private readonly paymentServiceService: PaymentServiceService) {}

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.GENERATE_INDIVIDUAL_KHQR)
  async generateIndividualKHQR(
    @Payload() generateIndividualKhqrDTO: GenerateIndividualKhqrDTO,
  ): Promise<any> {
    return this.paymentServiceService.generateIndividualKhqrDTO(
      generateIndividualKhqrDTO,
    );
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.GENERATE_MERCHANT_KHQR)
  async generateMerchantKhqrDTO(
    @Payload() generateMerchantKhqrDTO: GenerateMerchantKhqrDTO,
  ): Promise<any> {
    return this.paymentServiceService.generateMerchantKhqrDTO(
      generateMerchantKhqrDTO,
    );
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.VERIFY_KHQR)
  async verifyKhqr(@Payload() verifyKhqrDTO: VerifyKhqrDTO): Promise<any> {
    return this.paymentServiceService.verifyKhqr(verifyKhqrDTO);
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.DECODE_KHQR)
  async decodeKhqr(@Payload() decodeKhqrDTO: DecodeKhqrDTO): Promise<any> {
    return this.paymentServiceService.decodeKhqr(decodeKhqrDTO);
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.GENERATE_DEEP_LINK)
  async generateDeepLink(
    @Payload() generateDeepLinkDTO: GenerateDeepLinkDTO,
  ): Promise<any> {
    return this.paymentServiceService.generateDeepLink(generateDeepLinkDTO);
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.CHECK_PAYMENT_STATUS)
  async checkPaymentStatus(
    @Payload() checkPaymentStatusDTO: CheckPaymentStatusDTO,
  ): Promise<any> {
    return this.paymentServiceService.checkPaymentStatus(checkPaymentStatusDTO);
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.CHECK_PAYMENT_BULK_STATUS)
  async checkPaymentBulkStatus(
    @Payload() checkPaymentBulkStatusDTO: CheckPaymentBulkStatusDTO,
  ): Promise<any> {
    return this.paymentServiceService.checkPaymentBulkStatus(
      checkPaymentBulkStatusDTO,
    );
  }
}
