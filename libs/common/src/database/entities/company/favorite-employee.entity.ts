import {
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique
} from 'typeorm';
import { Employee } from '../employee/employee.entity';
import { Company } from './company.entity';

@Unique(['company', 'employee'])
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
