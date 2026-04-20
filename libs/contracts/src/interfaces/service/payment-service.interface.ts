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
  generateIndividualKhqrDTO(
    generateIndividualKhqrDTO: GenerateIndividualKhqrDTO,
  ): Promise<GenerateIndividualKhqrResponseDTO>;
  generateMerchantKhqrDTO(
    generateMerchantKhqrDTO: GenerateMerchantKhqrDTO,
  ): Promise<GenerateMerchantKhqrResponseDTO>;
  verifyKhqr(verifyKhqrDTO: VerifyKhqrDTO): Promise<VerifyKhqrResponseDTO>;
  decodeKhqr(decodeKhqrDTO: DecodeKhqrDTO): Promise<DecodeKhqrResponseDTO>;
  generateDeepLink(
    generateDeepLinkDTO: GenerateDeepLinkDTO,
  ): Promise<GenerateDeepLinkResponseDTO>;
  checkPaymentStatus(
    checkPaymentStatusDTO: CheckPaymentStatusDTO,
  ): Promise<CheckPaymentStatusResponseDTO>;
  checkPaymentBulkStatus(
    checkPaymentBulkStatusDTO: CheckPaymentBulkStatusDTO,
  ): Promise<CheckPaymentBulkStatusResponseDTO>;
}
