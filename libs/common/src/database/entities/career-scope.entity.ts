import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Employee } from './employee/employee.entity';
import { Company } from './company/company.entity';
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
