export const BAKONG_CONSTANTS = {
  // Currency codes
  CURRENCY: {
    KHR: 'KHR',
    USD: 'USD',
  },

  // Currency numeric codes (ISO 4217)
  CURRENCY_CODES: {
    KHR: '116',
    USD: '840',
  },

  // Country codes
  COUNTRY_CODE: 'KH',

  // Merchant category codes
  MERCHANT_CATEGORY_CODES: {
    GENERAL: '5999',
    RESTAURANT: '5812',
    RETAIL: '5300',
    GROCERY: '5411',
    GAS_STATION: '5542',
    HOTEL: '7011',
    TRANSPORT: '4111',
  },

  // QR Code specifications
  QR_SPECS: {
    PAYLOAD_FORMAT_INDICATOR: '01',
    POINT_OF_INITIATION_INDIVIDUAL: '11',
    POINT_OF_INITIATION_MERCHANT: '12',
    MAX_MERCHANT_NAME_LENGTH: 25,
    MAX_MERCHANT_CITY_LENGTH: 15,
    MAX_STORE_LABEL_LENGTH: 25,
    MAX_TERMINAL_LABEL_LENGTH: 25,
    MAX_BILL_NUMBER_LENGTH: 25,
    MAX_MOBILE_NUMBER_LENGTH: 15,
    MIN_MOBILE_NUMBER_LENGTH: 8,
  },

  // Error codes
  ERROR_CODES: {
    QR_GENERATION_FAILED: 'QR_GENERATION_FAILED',
    QR_VALIDATION_FAILED: 'QR_VALIDATION_FAILED',
    API_CONNECTION_FAILED: 'API_CONNECTION_FAILED',
    PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
    CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    INVALID_INPUT: 'INVALID_INPUT',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  },

  // Response messages
  MESSAGES: {
    SUCCESS: {
      QR_GENERATED: 'KHQR code generated successfully',
      QR_VERIFIED: 'KHQR code verified successfully',
      QR_DECODED: 'KHQR code decoded successfully',
      PAYMENT_FOUND: 'Payment status retrieved successfully',
      PAYMENT_NOT_FOUND: 'Payment not found',
      BULK_CHECK_COMPLETED: 'Bulk payment check completed',
      DEEPLINK_GENERATED: 'Payment deeplink generated successfully',
      IMAGE_GENERATED: 'QR code image generated successfully',
    },
    ERROR: {
      INVALID_QR: 'Invalid KHQR code format',
      MISSING_TOKEN: 'Bakong developer token is required',
      API_UNAVAILABLE: 'Bakong API is currently unavailable',
      INVALID_HASH: 'Invalid MD5 hash format',
      RATE_LIMIT: 'Rate limit exceeded, please try again later',
      INVALID_AMOUNT: 'Invalid amount specified',
      INVALID_CURRENCY: 'Invalid currency code',
      EXPIRED_QR: 'QR code has expired',
    },
  },

  // Validation patterns
  VALIDATION: {
    BAKONG_ACCOUNT_PATTERN: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/,
    MD5_HASH_PATTERN: /^[a-fA-F0-9]{32}$/,
    HEX_COLOR_PATTERN: /^#[0-9A-Fa-f]{6}$/,
    PHONE_NUMBER_PATTERN: /^[0-9+\-\s()]+$/,
  },

  // Default values
  DEFAULTS: {
    CURRENCY: 'KHR' as const,
    QR_IMAGE_WIDTH: 300,
    QR_IMAGE_MARGIN: 2,
    QR_ERROR_CORRECTION: 'M' as const,
    QR_DARK_COLOR: '#000000',
    QR_LIGHT_COLOR: '#FFFFFF',
    EXPIRATION_MINUTES: 30,
    API_TIMEOUT: 30000,
    RATE_LIMIT_REQUESTS: 100,
    RATE_LIMIT_WINDOW: 60000,
  },
};

// src/bakong/types/bakong.types.ts
export interface BakongAccountInfo {
  accountId: string;
  bankCode: string;
  username: string;
}

export interface QRCodeOptions {
  width?: number;
  height?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  dark?: string;
  light?: string;
}

export interface DeeplinkOptions {
  callback: string;
  appIconUrl?: string;
  appName?: string;
  customScheme?: string;
}

export interface PaymentTrackingInfo {
  md5Hash: string;
  qrString: string;
  amount: number;
  currency: string;
  merchantName: string;
  createdAt: Date;
  expiresAt?: Date;
  isStatic: boolean;
}

export type QRType = 'individual' | 'merchant';
export type PaymentStatus = 'pending' | 'paid' | 'expired' | 'failed';
export type CurrencyType = 'KHR' | 'USD';

export interface BakongServiceOptions {
  enableLogging?: boolean;
  enableRateLimit?: boolean;
  cacheQRCodes?: boolean;
  validateExpirations?: boolean;
}
