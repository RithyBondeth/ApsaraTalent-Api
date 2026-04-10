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

export const CHAT_WEBSOCKET_EVENTS = {
  // Chat Actions
  GET_ONLINE_USERS: 'getOnlineUsers',
  SEND_MESSAGE: 'sendMessage',
  GET_RECENT_CHATS: 'getRecentChats',
  GET_CHAT_HISTORY: 'getChatHistory',
  GET_UNREAD_COUNT: 'getUnreadCount',
  MARK_AS_READ: 'markAsRead',
  TYPING: 'typing',
  REACT: 'react',
  EDIT_MESSAGE: 'editMessage',
  DELETE_MESSAGE: 'deleteMessage',

  // Chat Events (emitted by server)
  USER_STATUS: 'userStatus',
  NEW_MESSAGE: 'newMessage',
  MESSAGE_READ: 'messageRead',
  USER_TYPING: 'userTyping',
  MESSAGE_REACTION: 'messageReaction',
  MESSAGE_EDITED: 'messageEdited',
  MESSAGE_DELETED: 'messageDeleted',
  NEW_NOTIFICATION: 'newNotification',

  // Call Actions
  CALL_OFFER: 'callOffer',
  CALL_ANSWER: 'callAnswer',
  ICE_CANDIDATE: 'iceCandidate',
  CALL_DECLINE: 'callDecline',
  CALL_END: 'callEnd',

  // Call Events (emitted by server)
  INCOMING_CALL: 'incomingCall',
  CALL_ANSWERED: 'callAnswered',
  REMOTE_ICE_CANDIDATE: 'remoteIceCandidate',
  CALL_DECLINED: 'callDeclined',
  CALL_ENDED: 'callEnded',
};
