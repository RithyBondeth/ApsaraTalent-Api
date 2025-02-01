import { EUserRole } from "@app/common/enums/user-role.enum";
import { Column, CreateDateColumn, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { UserProfile } from "./user-profile.entity";
import { JobPosting } from "./job-posting.entity";
import { Match } from "./match.entity";

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    firstname: string;

    @Column()
    lastname: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column({
        type: 'enum',
        enum: EUserRole,
        default: EUserRole.FREELANCER,
    })
    role: EUserRole;    

    @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
    profile: UserProfile;

    @OneToMany(() => JobPosting, (posting) => posting.employer, { cascade: true })
    jobPostings: JobPosting[];

    @OneToMany(() => Match, (match) => match.freelancer)
    freelancerMatches: Match[];

    @OneToMany(() => Match, (match) => match.employer)
    employerMatches: Match[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}