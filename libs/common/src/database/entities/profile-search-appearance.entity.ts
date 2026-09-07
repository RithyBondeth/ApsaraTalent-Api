import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * A daily counter of "how many times did this user appear in someone else's
 * search results". Stored as (user, date, count) so a busy search page bumps
 * a single row per user per day rather than writing a row per appearance.
 *
 * Split from `ProfileView` on purpose: viewers on that side matter, and the
 * table wants a full timeline. Search appearances are a bulk signal — nobody
 * asks "who was searching for me last Tuesday at 3pm"; the useful question is
 * "am I showing up more or less than last month", which a daily bucket
 * answers.
 *
 * The composite primary key (userId, date) makes the write an idempotent
 * upsert: `INSERT ... ON CONFLICT (userId, date) DO UPDATE SET count = ...`.
 * TypeORM's `upsert()` walks that path without a raw SQL statement.
 */
@Entity()
@Index(['user', 'date'])
export class ProfileSearchAppearance {
  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * The calendar date the appearances were counted on. Stored as `date`
   * (not `timestamptz`) so a user in a different timezone from the server
   * gets a consistent day boundary from the read side's `date_trunc('day')`.
   */
  @PrimaryColumn({ type: 'date' })
  date: string;

  @Column({ type: 'integer', default: 0 })
  count: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
