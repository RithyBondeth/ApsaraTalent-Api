import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { EApplicationStatus } from '../enums/application-status.enum';
import { Employee } from './employee/employee.entity';
import { Job } from './company/job.entity';

@Index(['job', 'status'])
@Entity()
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn()
  employee: Employee;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn()
  job: Job;

  @Column({
    type: 'enum',
    enum: EApplicationStatus,
    default: EApplicationStatus.PENDING,
  })
  status: EApplicationStatus;

  @Column({ type: 'text', nullable: true })
  coverLetterNote: string | null;

  /**
   * Why the company rejected. Null for every other status, and null on a
   * rejection where they declined to say.
   */
  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  /**
   * When the owning company first opened this application, stamped by the
   * applicant list rather than set by hand — the same shape as
   * `JobMatching.companySeenAt`. Null means nobody has looked yet, which is
   * what the old REVIEWED status was reaching for and never got right.
   */
  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  /**
   * When `status` last moved. Null on rows that have never left PENDING, so
   * "applied three weeks ago, untouched since" is answerable — the question a
   * hiring funnel is actually asked.
   */
  @Column({ type: 'timestamptz', nullable: true })
  statusChangedAt: Date | null;

  @CreateDateColumn()
  appliedAt: Date;
}
