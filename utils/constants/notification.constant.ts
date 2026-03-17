export const NOTIFICATION_SERVICE = {
  NAME: 'NOTIFICATION_SERVICE',
  ACTIONS: {
    CREATE_NOTIFICATION: { cmd: 'createNotification' },
    FIND_ALL_NOTIFICATIONS: { cmd: 'findAllNotifications' },
    LIST_BY_USER: { cmd: 'listNotificationsByUser' },
    MARK_READ: { cmd: 'markNotificationRead' },
    MARK_ALL_READ: { cmd: 'markAllNotificationsRead' },
    GET_UNREAD_COUNT: { cmd: 'getUnreadNotificationCount' },
  },
};
