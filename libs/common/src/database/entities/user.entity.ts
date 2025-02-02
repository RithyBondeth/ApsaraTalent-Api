import { EUserRole } from "@app/common/database/enums/user-role.enum";
import { BeforeInsert, Column, CreateDateColumn, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import * as bcrypt from 'bcrypt';
import { UserProfile } from "./user-profile.entity";
import { JobPosting } from "./job-posting.entity";
import { Match } from "./match.entity";
import { SALT_ROUNDS } from "utils/constants/password.constant";

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    firstname: string;

    @Column()
    lastname: string;

    @Column({ unique: true })
    username: string;

    @Column({ unique: true })
    email: string;

    @Column({
        type: 'enum',
        enum: EUserRole,
        default: EUserRole.FREELANCER,
    })
    role: EUserRole;  

    @Column()
    password: string;

    @BeforeInsert()
    async hashPassword() {
        if(this.password) 
            this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    }

    // Auth related fields
    @Column({ nullable: true })
    resetPasswordToken: string;

    @Column({ nullable: true })
    resetPasswordExpires: Date;

    @Column({ nullable: true })
    refreshToken: string;

    @Column({ default: false })
    isEmailVerified: boolean;

    @Column({ nullable: true })
    emailVerificationToken: string;

    // 2FA fields
    @Column({ default: false })
    isTwoFactorEnabled: boolean;

    @Column({ nullable: true })
    twoFactorSecret: string;

    // Social login fields
    @Column({ nullable: true })
    facebookId: string;

    @Column({ nullable: true })
    googleId: string;

    @Column({ nullable: true })
    linkedinId: string;

    @Column({ nullable: true })
    githubId: string;  

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