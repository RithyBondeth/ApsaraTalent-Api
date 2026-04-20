import {
  CheckPaymentBulkStatusDTO,
  CheckPaymentStatusDTO,
  DecodeKhqrDTO,
  GenerateDeepLinkDTO,
  GenerateIndividualKhqrDTO,
  GenerateMd5HashDTO,
  GenerateMerchantKhqrDTO,
  GenerateQrImageDTO,
  GenerateQrImageQueryDTO,
  KhqrInfoLookupDTO,
  PaymentInfoLookupDTO,
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
  VerifyKhqrDTO,
} from '@app/contracts/dtos/payment';

export interface IPaymentController {
  generateIndividualQr(
    generateIndividualQrDTO: GenerateIndividualKhqrDTO,
  ): Promise<GenerateIndividualKhqrResponseDTO>;
  generateMerchantQr(
    generateMerchantQrDTO: GenerateMerchantKhqrDTO,
  ): Promise<GenerateMerchantKhqrResponseDTO>;
  verifyKhqr(verifyKhqrDTO: VerifyKhqrDTO): Promise<VerifyKhqrResponseDTO>;
  decodeKhqr(verifyKhqrDTO: DecodeKhqrDTO): Promise<DecodeKhqrResponseDTO>;
  generateQRImage(
    generateQrImageDTO: GenerateQrImageDTO,
    format?: GenerateQrImageQueryDTO['format'],
  ): Promise<QrImageResponseDTO>;
  generateDeepLink(
    generateDeepLinkDTO: GenerateDeepLinkDTO,
  ): Promise<GenerateDeepLinkResponseDTO>;
  checkPaymentStatus(
    checkPaymentStatusDTO: CheckPaymentStatusDTO,
  ): Promise<CheckPaymentStatusResponseDTO>;
  checkPaymentBulkStatus(
    checkPaymentBulkStatusDTO: CheckPaymentBulkStatusDTO,
  ): Promise<CheckPaymentBulkStatusResponseDTO>;
  getPaymentInfo(
    md5Hash: PaymentInfoLookupDTO['md5Hash'],
  ): Promise<PaymentInfoResponseDTO>;
  getKHQRInfo(
    qrString: KhqrInfoLookupDTO['qrString'],
  ): Promise<KhqrInfoResponseDTO>;
  generateMd5Hash(
    generateMd5HashDTO: GenerateMd5HashDTO,
  ): Promise<Md5HashResponseDTO>;
}

export interface IPaymentRpcController {
  generateIndividualQr(
    generateIndividualQrDTO: GenerateIndividualKhqrDTO,
  ): Promise<GenerateIndividualKhqrResponseDTO>;
  generateMerchantQr(
    generateMerchantQrDTO: GenerateMerchantKhqrDTO,
  ): Promise<GenerateMerchantKhqrResponseDTO>;
  verifyKhqr(verifyKhqrDTO: VerifyKhqrDTO): Promise<VerifyKhqrResponseDTO>;
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
