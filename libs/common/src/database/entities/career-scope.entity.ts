import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Company } from './company/company.entity';
import { Employee } from './employee/employee.entity';
@Entity()
export class CareerScope {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToMany(() => Employee, (employee) => employee.careerScopes)
  employees: Employee[];

  @ManyToMany(() => Company, (company) => company.careerScopes)
  companies: Company[];
}
