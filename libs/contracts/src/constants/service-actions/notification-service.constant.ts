export const NOTIFICATION_SERVICE = {
  NAME: 'NOTIFICATION_SERVICE',
  ACTIONS: {
    CREATE_NOTIFICATION: { cmd: 'createNotification' },
    FIND_ALL_NOTIFICATIONS: { cmd: 'findAllNotifications' },
    LIST_BY_USER: { cmd: 'listNotificationsByUser' },
    MARK_READ: { cmd: 'markNotificationRead' },
    MARK_ALL_READ: { cmd: 'markAllNotificationsRead' },
    GET_UNREAD_COUNT: { cmd: 'getUnreadNotificationCount' },
    DELETE_NOTIFICATION: { cmd: 'deleteNotification' },
    DELETE_ALL_NOTIFICATIONS: { cmd: 'deleteAllNotifications' },
    GET_PREFERENCES: { cmd: 'getNotificationPreferences' },
    UPDATE_PREFERENCES: { cmd: 'updateNotificationPreferences' },
    UNSUBSCRIBE: { cmd: 'unsubscribeFromNotificationEmails' },
  },
};
