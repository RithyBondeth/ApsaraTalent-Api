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
  CheckPaymentBulkStatusResponseDTO,
  CheckPaymentStatusResponseDTO,
  DecodeKhqrResponseDTO,
  GenerateDeepLinkResponseDTO,
  GenerateIndividualKhqrResponseDTO,
  GenerateMerchantKhqrResponseDTO,
  VerifyKhqrResponseDTO,
} from '@app/contracts/dtos/payment';

export const I_PAYMENT_SERVICE = 'IPaymentService';

export interface IPaymentService {
  generateIndividualKhqrDTO(dto: GenerateIndividualKhqrDTO): Promise<GenerateIndividualKhqrResponseDTO>;
  generateMerchantKhqrDTO(dto: GenerateMerchantKhqrDTO): Promise<GenerateMerchantKhqrResponseDTO>;
  verifyKhqr(dto: VerifyKhqrDTO): Promise<VerifyKhqrResponseDTO>;
  decodeKhqr(dto: DecodeKhqrDTO): Promise<DecodeKhqrResponseDTO>;
  generateDeepLink(dto: GenerateDeepLinkDTO): Promise<GenerateDeepLinkResponseDTO>;
  checkPaymentStatus(dto: CheckPaymentStatusDTO): Promise<CheckPaymentStatusResponseDTO>;
  checkPaymentBulkStatus(dto: CheckPaymentBulkStatusDTO): Promise<CheckPaymentBulkStatusResponseDTO>;
}
