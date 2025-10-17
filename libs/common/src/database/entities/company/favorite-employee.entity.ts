import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { Employee } from '../employee/employee.entity';

@Entity()
export class CompanyFavoriteEmployee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, (company) => company.favorites, {
    onDelete: 'CASCADE',
  })
  company: Company;

  @ManyToOne(() => Employee, { eager: true, onDelete: 'CASCADE' })
  employee: Employee;

  @CreateDateColumn()
  createdAt: Date;
}
