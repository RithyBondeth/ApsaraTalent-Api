/**
 * Response shapes for the payment microservice (Bakong KHQR integration).
 * These are pure type-only interfaces that mirror the exact return values
 * of PaymentService methods — no runtime impact.
 */

export interface GenerateIndividualKhqrResponse {
  success: true;
  paymentId: string;
  qrString: string;
  md5Hash: string;
  qrImage: string;
  expiresAt: Date | null;
  message: string;
}

export interface GenerateMerchantKhqrResponse {
  success: true;
  paymentId: string;
  qrString: string;
  md5Hash: string;
  qrImage: string;
  message: string;
}

export interface VerifyKhqrResponseValid {
  success: true;
  isValid: true;
  qrData: any;
  message: string;
}

export interface VerifyKhqrResponseInvalid {
  success: false;
  isValid: false;
  message: string;
}

export type VerifyKhqrResponse =
  | VerifyKhqrResponseValid
  | VerifyKhqrResponseInvalid;

export interface DecodeKhqrDecodedData {
  merchantName: any;
  merchantCity: any;
  amount: any;
  currency: any;
  bakongAccountId: any;
  billNumber: any;
  mobileNumber: any;
  storeLabel: any;
  terminalLabel: any;
}

export interface DecodeKhqrResponse {
  success: true;
  decodedData: DecodeKhqrDecodedData;
  message: string;
}

export interface GenerateDeepLinkResponse {
  success: true;
  deepLink: any;
  shortUrl: any;
  qrString: string;
  message: string;
}

export interface CheckPaymentStatusPayerInfo {
  name: any;
  phone: any;
}

export interface CheckPaymentStatusFoundResponse {
  success: true;
  paymentId: string;
  paymentStatus: any;
  transactionId: any;
  amount: any;
  currency: any;
  paidAt: any;
  payerInfo: CheckPaymentStatusPayerInfo | null;
  message: string;
}

export interface CheckPaymentStatusNotFoundResponse {
  success: false;
  paymentId: string;
  paymentStatus: 'not_found';
  message: string;
}

export type CheckPaymentStatusResponse =
  | CheckPaymentStatusFoundResponse
  | CheckPaymentStatusNotFoundResponse;

export interface CheckPaymentBulkStatusItem {
  md5Hash: any;
  status: any;
  transactionId: any;
  amount: any;
  currency: any;
  paidAt: any;
  payerInfo: { name: any; phone: any } | null;
}

export interface CheckPaymentBulkStatusSummary {
  paid: number;
  pending: number;
  expired: number;
  failed: number;
}

export interface CheckPaymentBulkStatusResponse {
  success: true;
  totalChecked: number;
  payments: CheckPaymentBulkStatusItem[];
  summary: CheckPaymentBulkStatusSummary;
  message: string;
}
