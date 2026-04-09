import { parseAllowedOrigins } from 'apps/api-gateway/src/utils/cors-origin.util';

export const ALLOWED_MIME_TYPES_FOR_CHAT: string[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

export const MAX_FILE_SIZE_BYTES_FOR_CHAT: number = 10 * 1024 * 1024; // 10 MB

export const CHAT_ALLOWED_ORIGINS = parseAllowedOrigins(
  process.env.ALLOWED_ORIGINS,
  process.env.FRONTEND_ORIGIN,
);
export const CHAT_ALLOW_ALL_CORS = process.env.CORS_ALLOW_ALL === 'true';
