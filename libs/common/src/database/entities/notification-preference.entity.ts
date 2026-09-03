import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ENotificationCategory } from '../enums/notification-category.enum';
import { ENotificationChannel } from '../enums/notification-channel.enum';
import { User } from './user.entity';

/** Per-category channel switches. A missing entry means "not yet chosen". */
export type TNotificationChannelMap = Partial<
  Record<ENotificationCategory, Partial<Record<ENotificationChannel, boolean>>>
>;

/**
 * One row per user, holding what they have chosen to be contacted about.
 *
 * **Absence of a row means every default applies** — the table is written the
 * first time someone changes something, so it stays empty for users who never
 * open the setting. Nothing may assume the row exists; go through
 * `NotificationPreferenceService.resolve()`, which merges over the defaults.
 *
 * `categories` is jsonb rather than a column per category-and-channel. The
 * category list is expected to grow, and the alternative is a migration (and a
 * schema change on a hot table) every time a new kind of notification ships.
 * The TS enums are the source of truth for what is valid; unknown keys are
 * ignored on read and rejected on write.
 */
@Entity()
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  /**
   * Master switch. Off means no notification email of any category — the
   * "unsubscribe from everything" that a one-click unsubscribe link sets, and
   * the reason that link does not need to name a category.
   *
   * Account email is unaffected: it is transactional and never suppressed.
   */
  @Column({ default: true })
  emailEnabled: boolean;

  @Column({ default: true })
  pushEnabled: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  categories: TNotificationChannelMap;

  /**
   * Bearer token for one-click unsubscribe, so a link in an email footer works
   * without a login. Random, per user, and revocable by rotating it.
   *
   * Unsubscribing is the *only* thing it authorizes — it can turn email off and
   * nothing else. A link that could turn email back on would let anyone who
   * ever received a forwarded email re-subscribe the recipient.
   */
  @Index('IDX_notification_preference_unsubscribe_token', { unique: true })
  @Column({ length: 64, unique: true })
  unsubscribeToken: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
