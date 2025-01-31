import { EGender } from "@app/common/enums/gender.enum";
import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "./user.entity";

@Entity()
export class UserProfile {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => User, (user) => user.profile)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ nullable: true })
    avatar: string;

    @Column({ nullable: true })
    bio: string;
    
    @Column({ 
        type: 'enum',
        enum: EGender,
        default: EGender.OTHER, 
    })
    gender: EGender;
    
    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    address: string;

    @Column('text', { array: true, nullable: true })
    skills: string[];

    @Column({ nullable: true })
    experience: string;

    @Column({ nullable: true })
    portfolioUrl: string;

    @Column({ nullable: true })
    linkedInUrl: string;

    @Column({ nullable: true })
    facebookUrl: string;

    @Column({ nullable: true })
    instagramUrl: string;  

    @Column({ nullable: true })
    githubUrl: string;

    // For Employers
    @Column({ nullable: true })
    companyName: string

    @Column({ nullable: true })
    companyDescription: string

    @Column({ nullable: true })
    companyLogo: string    

    @Column({ nullable: true })
    companyWebsite: string

    @Column({ nullable: true })
    industry: string

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}