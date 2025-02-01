import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { JobPosting } from "./job-posting.entity";
import { User } from "./user.entity";
import { Message } from "./message.entity";

@Entity()
export class Match {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ default: false })
    freelancerLiked: boolean;

    @Column({ default: false })
    employerLiked: boolean;

    @Column({ default: false })
    isMatched: boolean;

    @ManyToOne(() => JobPosting, (jobPosting) => jobPosting.matches)
    @JoinColumn({ name: 'job_posting_id' })
    jobPosting: JobPosting;

    @ManyToOne(() => User, (user) => user.freelancerMatches)
    @JoinColumn({ name: 'freelancer_id' })
    freelancer: User;

    @ManyToOne(() => User, (user) => user.employerMatches)
    @JoinColumn({ name: 'employer_id' })
    employer: User;

    @OneToMany(() => Message, (message) => message.match)
    messages: Message[];

    @CreateDateColumn()
    createdAt: Date;
}