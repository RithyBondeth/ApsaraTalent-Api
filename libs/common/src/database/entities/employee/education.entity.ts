import { Column, Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Employee } from "./employee.entiry";

@Entity()
export class Education {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Employee, (employee) => employee.educations, { onDelete: 'CASCADE' })
    employee: Employee;

    @Column()
    school: string;

    @Column()
    degree: string;

    @Column()
    year: string;   
}