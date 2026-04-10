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

export const CHAT = {
  /** Default avatar when a user has no profile picture */
  DEFAULT_AVATAR_PATH: '/avatars/default.png',
  /** Maximum allowed text content length per message */
  MAX_MESSAGE_LENGTH: 5_000,
  /** Default number of messages returned in chat history */
  DEFAULT_HISTORY_LIMIT: 50,
  /** Hard cap on messages per history request */
  MAX_HISTORY_LIMIT: 100,
  /** Hard cap on history offset to prevent runaway queries */
  MAX_HISTORY_OFFSET: 10_000,
  /** Maximum recent-chat entries fetched per user */
  MAX_RECENT_CHATS: 100,
} as const;
