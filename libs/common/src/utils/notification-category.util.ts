import { ENotificationCategory } from '../database/enums/notification-category.enum';
import { ENotificationChannel } from '../database/enums/notification-channel.enum';

/**
 * Maps the `Notification.type` strings the feed already writes onto the
 * categories a user can switch off.
 *
 * Several types collapse into one category deliberately — see the note on
 * `ENotificationCategory`. Anything absent here resolves to ACCOUNT, which is
 * never suppressible: an unmapped type is far more likely to be a new
 * transactional message than a new marketing one, and the safe default for
 * "I don't know what this is" is to deliver it.
 */
export const NOTIFICATION_TYPE_CATEGORIES: Record<
  string,
  ENotificationCategory
> = {
  application: ENotificationCategory.APPLICATION,
  offer: ENotificationCategory.APPLICATION,
  interview: ENotificationCategory.INTERVIEW,
  match: ENotificationCategory.MATCH,
  like: ENotificationCategory.MATCH,
  chat: ENotificationCategory.MESSAGE,
  call: ENotificationCategory.MESSAGE,
};

export const categoryForNotificationType = (
  type: string | null | undefined,
): ENotificationCategory =>
  (type && NOTIFICATION_TYPE_CATEGORIES[type]) ?? ENotificationCategory.ACCOUNT;

/**
 * What each channel does when a user has expressed no opinion.
 *
 * Everything is on. The platform is a two-sided marketplace where the whole
 * value of an account is being told that something happened — a default of
 * "off" would mean a candidate never hears that they were shortlisted. The
 * setting exists so people can turn the volume down, not so they start deaf.
 */
export const DEFAULT_CHANNEL_PREFERENCES: Record<
  ENotificationCategory,
  Record<ENotificationChannel, boolean>
> = {
  [ENotificationCategory.APPLICATION]: { email: true, push: true },
  [ENotificationCategory.INTERVIEW]: { email: true, push: true },
  [ENotificationCategory.MATCH]: { email: true, push: true },
  // Email off by default: chat is real-time and already pushes. Emailing every
  // message would be the single loudest thing the platform does.
  [ENotificationCategory.MESSAGE]: { email: false, push: true },
  [ENotificationCategory.ACCOUNT]: { email: true, push: true },
};
