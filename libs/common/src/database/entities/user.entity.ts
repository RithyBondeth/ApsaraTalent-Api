<<<<<<< HEAD
import { EUserRole } from "@app/common/database/enums/user-role.enum";
import { BeforeInsert, Column, CreateDateColumn, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import * as bcrypt from 'bcrypt';
import { UserProfile } from "./user-profile.entity";
import { JobPosting } from "./job-posting.entity";
import { Match } from "./match.entity";
import { SALT_ROUNDS } from "utils/constants/password.constant";
=======
import * as bcrypt from 'bcrypt';
import {
    BeforeInsert,
    BeforeUpdate,
    Column,
    CreateDateColumn,
    Entity,
    OneToOne,
    PrimaryGeneratedColumn
} from 'typeorm';
import { SALT_ROUNDS } from 'utils/constants/password.constant';
import { ELoginMethod } from '../enums/login-method.enum';
import { EUserRole } from '../enums/user-role.enum';
import { Company } from './company/company.entity';
import { Employee } from './employee/employee.entity';
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: EUserRole })
  role: EUserRole;

  @OneToOne(() => Employee, (employee) => employee.user)
  employee: Employee;

<<<<<<< HEAD
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
=======
  @OneToOne(() => Company, (company) => company.user)
  company: Company;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: true }) //Optional for social login and OTP Login
  password: string;
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af

  @BeforeInsert()
  async hashPassword() {
    if (this.password)
      this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  }

  @BeforeUpdate()
  async hashPasswordOnUpdate() {
    // Only hash if the password was changed (i.e. it is not already a bcrypt hash)
    if (this.password && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    }
  }

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  otpCode: string;

  @Column({ nullable: true })
  otpCodeExpires: Date;

  @Column({ nullable: true }) // For push notifications services
  pushNotificationToken: string;

  @Column({ default: false })
  profileCompleted: boolean;

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

  @Column({ type: 'enum', enum: ELoginMethod, nullable: true })
  lastLoginMethod: ELoginMethod;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
