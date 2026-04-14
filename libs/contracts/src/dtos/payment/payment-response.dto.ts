/**
 * Response DTOs for the payment microservice (Bakong KHQR integration).
 * Replaces the former payment-response.interface.ts — these are concrete
 * classes so they can be used as Swagger/OpenAPI schema targets and
 * class-transformer serialisation targets.
 */

// ─── Generate Individual KHQR ────────────────────────────────────────────────

export class GenerateIndividualKhqrResponseDTO {
  success: true;
  paymentId: string;
  qrString: string;
  md5Hash: string;
  qrImage: string;
  expiresAt: Date | null;
  message: string;
}

// ─── Generate Merchant KHQR ──────────────────────────────────────────────────

export class GenerateMerchantKhqrResponseDTO {
  success: true;
  paymentId: string;
  qrString: string;
  md5Hash: string;
  qrImage: string;
  message: string;
}

// ─── Verify KHQR ─────────────────────────────────────────────────────────────

export class VerifyKhqrResponseValidDTO {
  success: true;
  isValid: true;
  /** Raw decoded QR data returned by the Bakong library. */
  qrData: Record<string, unknown>;
  message: string;
}

export class VerifyKhqrResponseInvalidDTO {
  success: false;
  isValid: false;
  message: string;
}

export type VerifyKhqrResponseDTO =
  | VerifyKhqrResponseValidDTO
  | VerifyKhqrResponseInvalidDTO;

// ─── Decode KHQR ─────────────────────────────────────────────────────────────

export class DecodeKhqrDecodedDataDTO {
  merchantName: string | null;
  merchantCity: string | null;
  amount: number | null;
  currency: string | null;
  bakongAccountId: string | null;
  billNumber: string | null;
  mobileNumber: string | null;
  storeLabel: string | null;
  terminalLabel: string | null;
}

export class DecodeKhqrResponseDTO {
  success: true;
  decodedData: DecodeKhqrDecodedDataDTO;
  message: string;
}

// ─── Generate Deep Link ───────────────────────────────────────────────────────

export class GenerateDeepLinkResponseDTO {
  success: true;
  deepLink: string;
  shortUrl: string;
  qrString: string;
  message: string;
}

// ─── Check Payment Status ─────────────────────────────────────────────────────

export class CheckPaymentStatusPayerInfoDTO {
  name: string | null;
  phone: string | null;
}

export class CheckPaymentStatusFoundResponseDTO {
  success: true;
  paymentId: string;
  paymentStatus: string;
  transactionId: string | null;
  amount: number | null;
  currency: string | null;
  paidAt: string | null;
  payerInfo: CheckPaymentStatusPayerInfoDTO | null;
  message: string;
}

export class CheckPaymentStatusNotFoundResponseDTO {
  success: false;
  paymentId: string;
  paymentStatus: 'not_found';
  message: string;
}

export type CheckPaymentStatusResponseDTO =
  | CheckPaymentStatusFoundResponseDTO
  | CheckPaymentStatusNotFoundResponseDTO;

// ─── Check Payment Bulk Status ────────────────────────────────────────────────

export class CheckPaymentBulkStatusItemDTO {
  md5Hash: string;
  status: string;
  transactionId: string | null;
  amount: number | null;
  currency: string | null;
  paidAt: string | null;
  payerInfo: CheckPaymentStatusPayerInfoDTO | null;
}

export class CheckPaymentBulkStatusSummaryDTO {
  paid: number;
  pending: number;
  expired: number;
  failed: number;
}

export class CheckPaymentBulkStatusResponseDTO {
  success: true;
  totalChecked: number;
  payments: CheckPaymentBulkStatusItemDTO[];
  summary: CheckPaymentBulkStatusSummaryDTO;
  message: string;
}
