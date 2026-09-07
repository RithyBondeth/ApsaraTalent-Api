import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * A single "someone opened your profile" event. Deliberately a row per view
 * rather than a per-viewer counter — the analytics answer is not just "how
 * many" but "who and when", and preserving the timeline lets the read layer
 * produce weekly / monthly totals without a second column per window.
 *
 * `viewer` is nullable so a view from a signed-out visitor still counts
 * (they contribute to the number even if we can't name them). `ON DELETE
 * SET NULL` on `viewer` keeps a deleted viewer's contribution to the count
 * without stapling their identity to the row after they left.
 *
 * `viewed` cascades: if the profile owner deletes their account, the view
 * history of the account that no longer exists goes with them — nobody else
 * will ever ask for it, and it is their data by construction.
 *
 * The primary read is "most recent unique viewers on this profile in the
 * last N days"; the (viewedId, viewedAt DESC) index answers it directly.
 */
@Index(['viewed', 'viewedAt'])
@Entity()
export class ProfileView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  viewer: User | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  viewed: User;

  @CreateDateColumn()
  viewedAt: Date;

  /**
   * True when the viewer was in browse-privately mode at view time. The row
   * still exists (counts still update, so the profile owner sees the number
   * move) but the identity is not surfaced on the recent-viewers list. A
   * per-row flag rather than a null viewer lets us tell "anonymous by choice"
   * apart from "signed-out visitor", which is a different story to tell.
   */
  @Column({ type: 'boolean', default: false })
  viewerHidden: boolean;
}
