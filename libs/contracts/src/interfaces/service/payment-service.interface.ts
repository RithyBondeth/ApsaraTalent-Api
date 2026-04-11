import { CheckPaymentBulkStatusDTO } from 'apps/payment-service/src/dtos/check-payment-bulk-status.dto';
import { CheckPaymentStatusDTO } from 'apps/payment-service/src/dtos/check-payment-status.dto';
import { DecodeKhqrDTO } from 'apps/payment-service/src/dtos/decode-khqr.dto';
import { GenerateDeepLinkDTO } from 'apps/payment-service/src/dtos/generate-deeplink.dto';
import { GenerateIndividualKhqrDTO } from 'apps/payment-service/src/dtos/generate-individual-khqr.dto';
import { GenerateMerchantKhqrDTO } from 'apps/payment-service/src/dtos/generate-merchant-khqr.dto';
import { VerifyKhqrDTO } from 'apps/payment-service/src/dtos/verify-khqr.dto';
import {
  CheckPaymentBulkStatusResponse,
  CheckPaymentStatusResponse,
  DecodeKhqrResponse,
  GenerateDeepLinkResponse,
  GenerateIndividualKhqrResponse,
  GenerateMerchantKhqrResponse,
  VerifyKhqrResponse,
} from '../domain/payment-response.interface';

export const I_PAYMENT_SERVICE = 'IPaymentService';

export interface IPaymentService {
  generateIndividualKhqrDTO(
    generateIndividualKhqrDTO: GenerateIndividualKhqrDTO,
  ): Promise<GenerateIndividualKhqrResponse>;
  generateMerchantKhqrDTO(
    generateMerchantKhqrDTO: GenerateMerchantKhqrDTO,
  ): Promise<GenerateMerchantKhqrResponse>;
  verifyKhqr(verifyKhqrDTO: VerifyKhqrDTO): Promise<VerifyKhqrResponse>;
  decodeKhqr(decodeKhqrDTO: DecodeKhqrDTO): Promise<DecodeKhqrResponse>;
  generateDeepLink(
    generateDeepLinkDTO: GenerateDeepLinkDTO,
  ): Promise<GenerateDeepLinkResponse>;
  checkPaymentStatus(
    checkPaymentStatusDTO: CheckPaymentStatusDTO,
  ): Promise<CheckPaymentStatusResponse>;
  checkPaymentBulkStatus(
    checkPaymentBulkStatusDTO: CheckPaymentBulkStatusDTO,
  ): Promise<CheckPaymentBulkStatusResponse>;
}
