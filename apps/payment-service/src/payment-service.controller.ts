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
import { IPaymentRpcController } from '@app/contracts/interfaces/controller/payment-controller.interface';
import {
  I_PAYMENT_SERVICE,
  IPaymentService,
} from '@app/contracts/interfaces/service/payment-service.interface';
import {
  CheckPaymentBulkStatusResponseDTO,
  CheckPaymentStatusResponseDTO,
  DecodeKhqrResponseDTO,
  GenerateDeepLinkResponseDTO,
  GenerateIndividualKhqrResponseDTO,
  GenerateMerchantKhqrResponseDTO,
  VerifyKhqrResponseDTO,
} from '@app/contracts/dtos/payment';

@Controller()
export class PaymentController implements IPaymentRpcController {
  constructor(
    @Inject(I_PAYMENT_SERVICE)
    private readonly paymentService: IPaymentService,
  ) {}

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.GENERATE_INDIVIDUAL_KHQR)
  @RateLimit(50)
  async generateIndividualQr(
    @Payload() generateIndividualKhqrDTO: GenerateIndividualKhqrDTO,
  ): Promise<GenerateIndividualKhqrResponseDTO> {
    return this.paymentService.generateIndividualKhqrDTO(
      generateIndividualKhqrDTO,
    );
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.GENERATE_MERCHANT_KHQR)
  @RateLimit(50)
  async generateMerchantQr(
    @Payload() generateMerchantKhqrDTO: GenerateMerchantKhqrDTO,
  ): Promise<GenerateMerchantKhqrResponseDTO> {
    return this.paymentService.generateMerchantKhqrDTO(generateMerchantKhqrDTO);
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.VERIFY_KHQR)
  async verifyKhqr(
    @Payload() verifyKhqrDTO: VerifyKhqrDTO,
  ): Promise<VerifyKhqrResponseDTO> {
    return this.paymentService.verifyKhqr(verifyKhqrDTO);
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.DECODE_KHQR)
  async decodeKhqr(
    @Payload() decodeKhqrDTO: DecodeKhqrDTO,
  ): Promise<DecodeKhqrResponseDTO> {
    return this.paymentService.decodeKhqr(decodeKhqrDTO);
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.GENERATE_DEEP_LINK)
  async generateDeepLink(
    @Payload() generateDeepLinkDTO: GenerateDeepLinkDTO,
  ): Promise<GenerateDeepLinkResponseDTO> {
    return this.paymentService.generateDeepLink(generateDeepLinkDTO);
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.CHECK_PAYMENT_STATUS)
  async checkPaymentStatus(
    @Payload() checkPaymentStatusDTO: CheckPaymentStatusDTO,
  ): Promise<CheckPaymentStatusResponseDTO> {
    return this.paymentService.checkPaymentStatus(checkPaymentStatusDTO);
  }

  @MessagePattern(PAYMENT_SERVICE.ACTIONS.CHECK_PAYMENT_BULK_STATUS)
  async checkPaymentBulkStatus(
    @Payload() checkPaymentBulkStatusDTO: CheckPaymentBulkStatusDTO,
  ): Promise<CheckPaymentBulkStatusResponseDTO> {
    return this.paymentService.checkPaymentBulkStatus(
      checkPaymentBulkStatusDTO,
    );
  }
}
