import { CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Employee } from "./employee.entity";
import { Company } from "../company/company.entity";

@Entity()
export class EmployeeFavoriteCompany {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee, (employee) => employee.favorites, { onDelete: 'CASCADE' })
  employee: Employee;

  @ManyToOne(() => Company, { eager: true, onDelete: 'CASCADE' })
  company: Company;

  @CreateDateColumn()
  createdAt: Date;
}