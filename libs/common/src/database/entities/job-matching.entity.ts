import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Company } from './company/company.entity';
import { Employee } from './employee/employee.entity';

@Unique(['employee', 'company'])
@Entity()
export class JobMatching {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee)
  employee: Employee;

  @ManyToOne(() => Company)
  company: Company;

  @Column({ default: false })
  employeeLiked: boolean;

  @Column({ default: false })
  companyLiked: boolean;

  @Column({ default: false })
  isMatched: boolean;

  /** Skill overlap alone, 0–100. Kept as its own number for continuity. */
  @Column({ type: 'smallint', nullable: true })
  skillScore: number | null;

  /**
   * Overall fit, 0–100, weighting skills, experience, employment type, work
   * mode, languages and location. Null when nothing could be compared.
   */
  @Column({ type: 'smallint', nullable: true })
  matchScore: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
