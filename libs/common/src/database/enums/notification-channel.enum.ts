/**
 * How a notification can reach someone.
 *
 * IN_APP is absent by design: the notification feed is the record of what
 * happened, not a delivery channel, and a feed a user has switched off would
 * leave them with no way to find out what they missed. Preferences govern the
 * channels that push into someone's attention.
 */
export enum ENotificationChannel {
  EMAIL = 'email',
  PUSH = 'push',
}
