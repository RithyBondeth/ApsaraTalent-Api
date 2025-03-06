import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../user.entiry";
import { EGender } from "../../enums/gender.enum";
import { Skill } from "./skill.entity";
import { Education } from "./education.entity";
import { Experience } from "./experince.entity";
import { Social } from "../social.entity";
import { CareerScope } from "../career-scope.entity";

@Entity()
export class Employee {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => User, (user) => user.employee, { onDelete: 'CASCADE' })
    @JoinColumn()
    user: User;

    @Column()
    firstname: string;

    @Column()
    lastname: string;
    
    @Column()
    username: string;

    @Column({ type: 'enum', enum: EGender, default: EGender.OTHER })
    gender: EGender;

    @Column({ nullable: true })
    avatar: string;

    @Column()
    job: string;

    @Column({ nullable: true })
    yearsOfExperience: number;

    @Column()
    availability: string;

    @Column('text')
    description: string;

    @Column()
    location: string;   

    @Column()
    phone: string;

    @ManyToMany(() => Skill, (skill) => skill.employees)
    @JoinTable()
    skills: Skill[];

    @OneToMany(() => Education, (education) => education.employee, { cascade: true })
    educations: Education[];

    @OneToMany(() => Experience, (experience) => experience.employee, { cascade: true })
    experiences: Experience[];

    @ManyToMany(() => CareerScope, (careerScope) => careerScope.employees)
    @JoinTable()
    careerScopes: CareerScope[];

    @OneToMany(() => Social, (social) => social.employee, { cascade: true })
    socials: Social[];

    @CreateDateColumn()
    createdAt: Date;
}