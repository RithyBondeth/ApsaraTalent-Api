import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Company } from "./company.entity";

@Entity()
export class Job {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Company, (company) => company.openPositions, { onDelete: 'CASCADE' })
    company: Company;

    @Column()
    title: string;

    @Column('text')
    description: string;
    
    @Column()
    type: string;
    
    @Column()
    experienceRequired: string;

    @Column()
    educationRequired: string;

    @Column()
    skillsRequired: string;

    @CreateDateColumn()
    createdAt: Date;   
}