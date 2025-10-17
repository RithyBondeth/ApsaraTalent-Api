import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Employee } from './employee/employee.entity';
import { Company } from './company/company.entity';

@Unique(['employee', 'company'])
@Entity()
export class JobMatching {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee, { eager: true })
  employee: Employee;

  @ManyToOne(() => Company, { eager: true })
  company: Company;

  @Column({ default: false })
  employeeLiked: boolean;

  @Column({ default: false })
  companyLiked: boolean;

  @Column({ default: false })
  isMatched: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
