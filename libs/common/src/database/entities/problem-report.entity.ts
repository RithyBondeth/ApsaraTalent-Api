import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EProblemCategory } from '../enums/problem-category.enum';
import { EReportStatus } from '../enums/report-status.enum';
import { User } from './user.entity';

/**
 * A problem report a user submitted through the support form.
 *
 * Separate from `UserReport`, which is *about someone* (the moderation queue).
 * A problem report is *about something on the page*: category, freeform text,
 * and the browser context the client captured. They share nothing but the word.
 *
 * `SupportService` used to email the report and drop it — nothing was written,
 * which is why a user submitting one and then opening the admin panel saw
 * nothing. The email still goes out; this table is what the admin queue reads.
 *
 * `status` reuses `EReportStatus` on purpose. The four labels apply
 * unchanged (pending / reviewed / resolved / dismissed), and reusing the enum
 * type keeps the admin_audit_log's metadata comparable between the two flows.
 */
@Entity()
export class ProblemReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Nullable so an anonymous submission (a future feature, and the safe posture
   * during account deletion) still records the report. `SET NULL` rather than
   * `CASCADE`: a user deleting their account should not erase the platform's
   * record that a bug was reported.
   */
  @Index()
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  reporter: User | null;

  @Column({
    type: 'enum',
    enum: EProblemCategory,
    enumName: 'problem_report_category_enum',
  })
  category: EProblemCategory;

  @Column('text')
  details: string;

  /**
   * The URL the reporter was on when they filed. Client-supplied, so treated
   * as diagnostic — never as a link to open blindly, never as trusted input.
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  pageUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: EReportStatus,
    enumName: 'problem_report_status_enum',
    default: EReportStatus.PENDING,
  })
  status: EReportStatus;

  /**
   * Free-text note written by the admin who last changed the status. The
   * "why" that would otherwise only live in the audit log — surfaced here so
   * a triage view does not have to join for it.
   */
  @Column({ type: 'text', nullable: true })
  resolutionNote: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
