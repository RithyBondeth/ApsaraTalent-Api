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
  },
};
