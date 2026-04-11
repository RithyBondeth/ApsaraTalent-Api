import {
  CheckPaymentBulkStatusResponse,
  CheckPaymentStatusResponse,
  DecodeKhqrResponse,
  GenerateDeepLinkResponse,
  GenerateIndividualKhqrResponse,
  GenerateMerchantKhqrResponse,
  VerifyKhqrResponse,
} from './payment-response.interface';

export interface IPaymentController {
  generateIndividualQr(
    generateIndividualQrDTO?: any,
  ): Promise<GenerateIndividualKhqrResponse>;
  generateMerchantQr(
    generateMerchantQrDTO?: any,
  ): Promise<GenerateMerchantKhqrResponse | void>;
  verifyKhqr(verifyKhqrDTO?: any): Promise<VerifyKhqrResponse>;
  decodeKhqr(verifyKhqrDTO?: any): Promise<DecodeKhqrResponse>;
  generateQRImage?(body?: any, format?: any): Promise<any>;
  generateDeepLink(generateDeepLinkDto?: any): Promise<GenerateDeepLinkResponse>;
  checkPaymentStatus(
    checkPaymentStatusDTO?: any,
  ): Promise<CheckPaymentStatusResponse>;
  checkPaymentBulkStatus(
    checkPaymentBulkStatusDTO?: any,
  ): Promise<CheckPaymentBulkStatusResponse>;
  getPaymentInfo?(md5Hash?: any): Promise<any>;
  getKHQRInfo?(qrString?: any): Promise<any>;
  generateMd5Hash?(body?: any): Promise<any>;
}
