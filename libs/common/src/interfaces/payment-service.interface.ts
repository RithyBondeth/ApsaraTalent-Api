import { CheckPaymentBulkStatusDTO } from 'apps/payment-service/src/dtos/check-payment-bulk-status.dto';
import { CheckPaymentStatusDTO } from 'apps/payment-service/src/dtos/check-payment-status.dto';
import { DecodeKhqrDTO } from 'apps/payment-service/src/dtos/decode-khqr.dto';
import { GenerateDeepLinkDTO } from 'apps/payment-service/src/dtos/generate-deeplink.dto';
import { GenerateIndividualKhqrDTO } from 'apps/payment-service/src/dtos/generate-individual-khqr.dto';
import { GenerateMerchantKhqrDTO } from 'apps/payment-service/src/dtos/generate-merchant-khqr.dto';
import { VerifyKhqrDTO } from 'apps/payment-service/src/dtos/verify-khqr.dto';

export const I_PAYMENT_SERVICE = 'IPaymentService';

export interface IPaymentService {
  generateIndividualKhqrDTO(
    generateIndividualKhqrDTO: GenerateIndividualKhqrDTO,
  ): Promise<any>;
  generateMerchantKhqrDTO(
    generateMerchantKhqrDTO: GenerateMerchantKhqrDTO,
  ): Promise<any>;
  verifyKhqr(verifyKhqrDTO: VerifyKhqrDTO): Promise<any>;
  decodeKhqr(decodeKhqrDTO: DecodeKhqrDTO): Promise<any>;
  generateDeepLink(generateDeepLinkDTO: GenerateDeepLinkDTO): Promise<any>;
  checkPaymentStatus(
    checkPaymentStatusDTO: CheckPaymentStatusDTO,
  ): Promise<any>;
  checkPaymentBulkStatus(
    checkPaymentBulkStatusDTO: CheckPaymentBulkStatusDTO,
  ): Promise<any>;
}
