import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EApplicationStatus } from '../enums/application-status.enum';
import { Application } from './application.entity';
import { User } from './user.entity';

/**
 * An append-only trail of every status transition for one application.
 * `Application.statusChangedAt` answers "when did this last move" for the
 * hiring funnel; this table answers "how did it get here", which is what a
 * recruiter reopening a candidate weeks later actually wants.
 *
 * `from` is null on the row written at apply time so PENDING has a first
 * entry, without having to fake a previous status.
 *
 * `actor` is the user who caused the transition — the company for stage moves,
 * the employee for a withdrawal. Nullable + ON DELETE SET NULL so a deleted
 * account does not take the trail with it.
 */
@Index(['application', 'createdAt'])
@Entity()
export class ApplicationStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn()
  application: Application;

  @Column({ type: 'enum', enum: EApplicationStatus, nullable: true })
  from: EApplicationStatus | null;

  @Column({ type: 'enum', enum: EApplicationStatus })
  to: EApplicationStatus;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  actor: User | null;

  /**
   * A rejection reason, or a withdrawal comment. Free-form; capped in the DTO
   * layer so the entity stays permissive.
   */
  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
