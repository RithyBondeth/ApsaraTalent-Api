import { registerAs } from '@nestjs/config';

export interface BakongConfig {
  developerToken: string;
  apiBaseUrl: string;
  apiTimeout: number;
  rateLimitRequests: number;
  rateLimitWindowMs: number;
  qrImageDefaultWidth: number;
  qrImageMaxWidth: number;
  qrExpirationMaxMinutes: number;
  bulkPaymentMaxHashes: number;
}

export default registerAs('bakong', (): BakongConfig => ({
  developerToken: process.env.BAKONG_DEVELOPER_TOKEN || '',
  apiBaseUrl: process.env.BAKONG_API_BASE_URL || 'https://api-bakong.nbc.gov.kh',
  apiTimeout: parseInt(process.env.BAKONG_API_TIMEOUT || '30000'),
  rateLimitRequests: parseInt(process.env.BAKONG_RATE_LIMIT_REQUESTS || '100'),
  rateLimitWindowMs: parseInt(process.env.BAKONG_RATE_LIMIT_WINDOW_MS || '60000'),
  qrImageDefaultWidth: parseInt(process.env.BAKONG_QR_IMAGE_DEFAULT_WIDTH || '300'),
  qrImageMaxWidth: parseInt(process.env.BAKONG_QR_IMAGE_MAX_WIDTH || '1000'),
  qrExpirationMaxMinutes: parseInt(process.env.BAKONG_QR_EXPIRATION_MAX_MINUTES || '10080'), // 7 days
  bulkPaymentMaxHashes: parseInt(process.env.BAKONG_BULK_PAYMENT_MAX_HASHES || '50'),
}));
