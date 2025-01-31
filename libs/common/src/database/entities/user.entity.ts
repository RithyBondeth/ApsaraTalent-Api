import { EUserRole } from "@app/common/enums/user-role.enum";
import { Column, CreateDateColumn, Entity, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { UserProfile } from "./user-profile.entity";

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
        default: EUserRole.FREELANCE,
    })
    role: EUserRole;

    // For Freelancer
    @Column({ nullable: true })
    cvFile: string;

    @Column({ nullable: true })
    coverLetterFile: string;

    @OneToOne(() => UserProfile, (profile) => profile.user)
    profile: UserProfile;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}