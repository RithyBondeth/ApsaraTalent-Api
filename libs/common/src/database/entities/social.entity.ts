import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Employee } from './employee/employee.entity';
import { Company } from './company/company.entity';

@Entity()
export class Social {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  platform: string;

  @Column()
  url: string;

  @ManyToOne(() => Employee, (employee) => employee.socials, {
    onDelete: 'CASCADE',
  })
  employee: Employee;

  @ManyToOne(() => Company, (company) => company.socials, {
    onDelete: 'CASCADE',
  })
  company: Company;
}
