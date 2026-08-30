import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EAdminAction } from '../../enums/admin-action.enum';
import { User } from '../user.entity';

/**
 * An append-only record of what an administrator did to somebody else's
 * account. Nothing updates or deletes these rows.
 *
 * Two deliberate denormalisations, both so the trail outlives its subjects:
 *
 * - `actor` is ON DELETE SET NULL rather than CASCADE, and `actorEmail` holds a
 *   snapshot. A departed admin's row must not take their decisions with it.
 * - `targetUserId` is a plain uuid column with no foreign key. Suspensions are
 *   frequently the prelude to a deletion, and a cascade would erase the record
 *   of exactly the accounts most worth having a record of.
 */
@Entity('admin_audit_log')
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actorId' })
  actor: User | null;

  /** Snapshot of the actor's email, kept readable after the account is gone. */
  @Column({ type: 'varchar', nullable: true })
  actorEmail: string | null;

  @Index()
  @Column({ type: 'enum', enum: EAdminAction })
  action: EAdminAction;

  /** The User this was done to. Not a FK — see the class comment. */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  targetUserId: string | null;

  /** The UserReport this concerned, when the action came out of the queue. */
  @Column({ type: 'uuid', nullable: true })
  targetReportId: string | null;

  /** The admin's own words. Shown back to the affected user where relevant. */
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  /** Before/after values, kept loose so new actions need no migration. */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
