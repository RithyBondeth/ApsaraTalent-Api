import { EJobPostingStatus } from "@app/common/database/enums/job-posting.enum";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "./user.entity";
import { Match } from "./match.entity";

@Entity()
export class JobPosting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, (user) => user.jobPostings)
    @JoinColumn({ name: 'employer_id' }) 
    employer: User;

    @Column()
    title: string;

    @Column()
    description: string;

    @Column('text', { array: true })
    requirements: string[];

    @Column()
    salary: string;

    @Column()
    location: string;

    @Column({ default: false })
    isRemote: boolean;

    @Column({ 
        type: 'enum',
        enum: EJobPostingStatus,
        default: EJobPostingStatus.OPEN, 
    })
    status: EJobPostingStatus;

    @Column()
    companyName: string;

    @Column()
    companyDescription: string;

    @OneToMany(() => Match, (match) => match.jobPosting)
    matches: Match[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
