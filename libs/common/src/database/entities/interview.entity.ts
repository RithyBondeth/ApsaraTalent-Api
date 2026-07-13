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

@Entity()
export class Interview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  employee: Employee;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  company: Company;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('timestamptz')
  scheduledAt: Date;

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
