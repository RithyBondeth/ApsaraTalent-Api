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
