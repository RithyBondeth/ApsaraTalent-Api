import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EReportReason } from '../../enums/report-reason.enum';
import { EReportStatus } from '../../enums/report-status.enum';
import { User } from '../user.entity';

@Entity()
export class UserReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  reporter: User;

  @Index()
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  reported: User;

  @Column({ type: 'enum', enum: EReportReason })
  reason: EReportReason;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Index()
  @Column({ type: 'enum', enum: EReportStatus, default: EReportStatus.PENDING })
  status: EReportStatus;

  @CreateDateColumn()
  createdAt: Date;
}
