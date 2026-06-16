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

  @Column({ type: 'smallint', nullable: true })
  skillScore: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
