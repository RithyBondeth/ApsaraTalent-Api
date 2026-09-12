import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from './employee/employee.entity';
import { Company } from './company/company.entity';
import { Application } from './application.entity';

@Entity()
export class Interview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  employee: Employee;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  company: Company;

  /**
   * The application this interview is for, when it came from one.
   *
   * Null for interviews created off a mutual match, which is how every
   * interview was created before the pipeline existed and remains a first-class
   * path. Without this column an interview belonged to an employee and a
   * company but to no role, so "which candidate, for which job, is at interview
   * stage" had no answer and APPLICATION.INTERVIEWING could not be trusted.
   *
   * ON DELETE SET NULL, not CASCADE: an interview is a thing that happened.
   * Losing the application should orphan it, not erase it.
   */
  @ManyToOne(() => Application, { nullable: true, onDelete: 'SET NULL' })
  application: Application | null;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('timestamptz')
  scheduledAt: Date;

  /**
   * The IANA timezone the schedule was picked in — the *scheduler's* local
   * zone at the moment of creation. `scheduledAt` above is already the correct
   * absolute point in time; this column exists so a render surface without a
   * browser (email, PDF, ICS) can label the time unambiguously as
   * "2:00 PM Asia/Phnom_Penh" instead of guessing.
   *
   * Nullable for rows that predate the column. The renderer falls back to UTC
   * when it is missing — legible, never wrong, just less friendly.
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  timezone: string | null;

  /**
   * When the corresponding reminder email went out. Idempotency for the
   * reminder cron: a row whose column is set has already had that reminder
   * sent, whatever the next cron tick's window looks like.
   *
   * Not a boolean because the timestamp is genuinely useful when someone asks
   * why a reminder did or didn't arrive.
   */
  @Column({ type: 'timestamptz', nullable: true })
  reminder24hSentAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  reminder1hSentAt: Date | null;

  @Column({ default: 30 })
  durationMinutes: number;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  meetingLink: string;

  @Column({ default: 'pending' })
  status: string; // 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled'

  @Column({ nullable: true })
  createdBy: string; // 'employee' | 'company' - who proposed the interview

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
