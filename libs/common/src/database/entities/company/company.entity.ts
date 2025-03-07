import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Benefit } from "./benefit.entity";
import { Value } from "./value.entity";
import { Job } from "./job.entity";
import { User } from "../user.entiry";
import { Social } from "../social.entity";
import { CareerScope } from "../career-scope.entity";

@Entity()
export class Company {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => User, (user) => user.company, { onDelete: 'CASCADE' })
    @JoinColumn()
    user: User;

    @Column()
    name: string; 

    @Column('text')
    description: string;
    
    @Column({ nullable: true })
    avatar: string;

    @Column({ nullable: true })
    cover: string;

    @Column()
    companySize: number;

    @Column()
    industry: string;

    @Column()
    location: string;
    
    @Column()
    foundedYear: number;

    @OneToMany(() => Job, (job) => job.company, { cascade: true })
    openPositions: Job[];

    @ManyToMany(() => Benefit, (benefit) => benefit.companies)
    @JoinTable()
    benefits: Benefit[];

    @ManyToMany(() => Value, (value) => value.companies)
    @JoinTable()
    values: Value[];

    @ManyToMany(() => CareerScope, (careerScope) => careerScope.companies)
    @JoinTable()
    careerScopes: CareerScope[];

    @OneToMany(() => Social, (social) => social.company, { cascade: true })
    socials: Social[];  

    @CreateDateColumn()
    createdAt: Date;
}   