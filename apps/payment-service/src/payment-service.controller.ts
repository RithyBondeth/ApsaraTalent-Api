import { Controller } from '@nestjs/common';
import { PaymentServiceService } from './payment-service.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PAYMENT_SERVICE } from 'utils/constants/payment-service.constant';
import { GenerateIndividualKhqrDTO } from './dtos/generate-individual-khqr.dto';
import { GenerateMerchantKhqrDTO } from './dtos/generate-merchant-khqr.dto';

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
}
