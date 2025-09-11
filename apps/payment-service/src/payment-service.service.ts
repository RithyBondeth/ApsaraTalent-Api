import { Injectable } from '@nestjs/common';
import { GenerateIndividualKhqrDTO } from './dtos/generate-individual-khqr.dto';
import { GenerateMerchantKhqrDTO } from './dtos/generate-merchant-khqr.dto';
import { VerifyKhqrDTO } from './dtos/verify-khqr.dto';
import { DecodeKhqrDTO } from './dtos/decode-khqr.dto';
import { GenerateDeepLinkDTO } from './dtos/generate-deeplink.dto';
import { CheckPaymentStatusDTO } from './dtos/check-payment-status.dto';
import { CheckPaymentBulkStatusDTO } from './dtos/check-payment-bulk-status.dto';

@Injectable()
export class PaymentServiceService {
  async generateIndividualKhqrDTO(
    generateIndividualKhqrDTO: GenerateIndividualKhqrDTO,
  ): Promise<any> {}

  async generateMerchantKhqrDTO(
    generateMerchantKhqrDTO: GenerateMerchantKhqrDTO,
  ): Promise<any> {}

  async verifyKhqr(verifyKhqrDTO: VerifyKhqrDTO): Promise<any> {}

  async decodeKhqr(decodeKhqr: DecodeKhqrDTO): Promise<any> {}

  async generateDeepLink(
    generateDeepLinkDTO: GenerateDeepLinkDTO,
  ): Promise<any> {}

  async checkPaymentStatus(
    checkPaymentStatusDTO: CheckPaymentStatusDTO,
  ): Promise<any> {}

  async checkPaymentBulkStatus(
    checkPaymentBulkStatusDTO: CheckPaymentBulkStatusDTO,
  ): Promise<any> {}
}
