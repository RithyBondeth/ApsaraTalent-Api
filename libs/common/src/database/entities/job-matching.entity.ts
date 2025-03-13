import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Employee } from "./employee/employee.entity";
import { Company } from "./company/company.entity";

@Entity()
export class JobMatching {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
    employee: Employee;

    @ManyToOne(() => Company, { onDelete: 'CASCADE' })
    company: Company;

    @Column()
    employeeLiked: boolean;

    @Column()
    companyLiked: boolean;

    @Column()
    matched: boolean;

    @CreateDateColumn()
    createdAt: Date;
}