import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { EApplicationStatus } from '../enums/application-status.enum';
import { Employee } from './employee/employee.entity';
import { Job } from './company/job.entity';

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

  @CreateDateColumn()
  appliedAt: Date;
}
