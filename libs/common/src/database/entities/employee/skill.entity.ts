import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { Employee } from "./employee.entiry";

@Entity()
export class Skill {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    name: string;

    @Column({ nullable: true })
    description: string;

    @ManyToMany(() => Employee, (employee) => employee.skills)
    employees: Employee[];
}