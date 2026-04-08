export interface IPaymentController {
  generateIndividualQr(generateIndividualQrDTO?: any): Promise<any>;
  generateMerchantQr(generateMerchantQrDTO?: any): Promise<any>;
  verifyKHQR(verifyKhqrDTO?: any): Promise<any>;
  decodeKHQR(verifyKhqrDTO?: any): Promise<any>;
  generateQRImage(body?: any, format?: any): Promise<any>;
  generateDeepLink(generateDeepLinkDto?: any): Promise<any>;
  checkPaymentStatus(checkPaymentStatusDTO?: any): Promise<any>;
  checkPaymentBulkStatus(checkPaymentBulkStatusDTO?: any): Promise<any>;
  getPaymentInfo(md5Hash?: any): Promise<any>;
  getKHQRInfo(qrString?: any): Promise<any>;
  generateMd5Hash(body?: any): Promise<any>;
}
