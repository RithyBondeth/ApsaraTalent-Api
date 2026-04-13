import {
  CheckPaymentBulkStatusDTO,
  CheckPaymentStatusDTO,
  DecodeKhqrDTO,
  GenerateDeepLinkDTO,
  GenerateIndividualKhqrDTO,
  GenerateMerchantKhqrDTO,
  VerifyKhqrDTO,
} from '@app/contracts/dtos/payment';
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
  generateIndividualKhqrDTO(dto: GenerateIndividualKhqrDTO): Promise<GenerateIndividualKhqrResponse>;
  generateMerchantKhqrDTO(dto: GenerateMerchantKhqrDTO): Promise<GenerateMerchantKhqrResponse>;
  verifyKhqr(dto: VerifyKhqrDTO): Promise<VerifyKhqrResponse>;
  decodeKhqr(dto: DecodeKhqrDTO): Promise<DecodeKhqrResponse>;
  generateDeepLink(dto: GenerateDeepLinkDTO): Promise<GenerateDeepLinkResponse>;
  checkPaymentStatus(dto: CheckPaymentStatusDTO): Promise<CheckPaymentStatusResponse>;
  checkPaymentBulkStatus(dto: CheckPaymentBulkStatusDTO): Promise<CheckPaymentBulkStatusResponse>;
}
