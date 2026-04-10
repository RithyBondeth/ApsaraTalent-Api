export const NOTIFICATION = {
  /** Minimum valid page number */
  MIN_PAGE: 1,
  /** Default notifications per page */
  DEFAULT_LIMIT: 20,
  /** Maximum notifications per page */
  MAX_LIMIT: 100,
} as const;

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
  },
};
