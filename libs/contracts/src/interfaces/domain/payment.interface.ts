import {
  CheckPaymentBulkStatusResponseDTO,
  CheckPaymentStatusResponseDTO,
  DecodeKhqrResponseDTO,
  GenerateDeepLinkResponseDTO,
  GenerateIndividualKhqrResponseDTO,
  GenerateMerchantKhqrResponseDTO,
  KhqrInfoResponseDTO,
  Md5HashResponseDTO,
  PaymentInfoResponseDTO,
  QrImageResponseDTO,
  VerifyKhqrResponseDTO,
} from '@app/contracts/dtos/payment';

export interface IPaymentController {
  generateIndividualQr(
    generateIndividualQrDTO?: any,
  ): Promise<GenerateIndividualKhqrResponseDTO>;
  generateMerchantQr(
    generateMerchantQrDTO?: any,
  ): Promise<GenerateMerchantKhqrResponseDTO | void>;
  verifyKhqr(verifyKhqrDTO?: any): Promise<VerifyKhqrResponseDTO>;
  decodeKhqr(verifyKhqrDTO?: any): Promise<DecodeKhqrResponseDTO>;
  generateQRImage?(body?: any, format?: any): Promise<QrImageResponseDTO>;
  generateDeepLink(
    generateDeepLinkDto?: any,
  ): Promise<GenerateDeepLinkResponseDTO>;
  checkPaymentStatus(
    checkPaymentStatusDTO?: any,
  ): Promise<CheckPaymentStatusResponseDTO>;
  checkPaymentBulkStatus(
    checkPaymentBulkStatusDTO?: any,
  ): Promise<CheckPaymentBulkStatusResponseDTO>;
  getPaymentInfo?(md5Hash?: any): Promise<PaymentInfoResponseDTO>;
  getKHQRInfo?(qrString?: any): Promise<KhqrInfoResponseDTO>;
  generateMd5Hash?(body?: any): Promise<Md5HashResponseDTO>;
}
