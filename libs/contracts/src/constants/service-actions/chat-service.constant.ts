export const CHAT_SERVICE = {
  NAME: 'CHAT_SERVICE',
  ACTIONS: {
    CREATE_OR_GET_CHAT: { cmd: 'createOrGetChat' },
    VALIDATE_CHAT_USERS: { cmd: 'validateChatUsers' },
    CREATE_MESSAGE: { cmd: 'createMessage' },
    GET_RECENT_CHATS: { cmd: 'getRecentChats' },
    GET_CHAT_HISTORY: { cmd: 'getChatHistory' },
    GET_UNREAD_COUNT: { cmd: 'getUnreadCount' },
    MARK_MESSAGE_READ: { cmd: 'markMessageRead' },
    UPDATE_REACTION: { cmd: 'updateReaction' },
    EDIT_MESSAGE: { cmd: 'editMessage' },
    DELETE_MESSAGE: { cmd: 'deleteMessage' },
    GET_USER_BY_ID_FOR_CHAT: { cmd: 'getUserByIdForChat' },
    CAN_ACCESS_ATTACHMENT: { cmd: 'canAccessAttachment' },
  },
};

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
