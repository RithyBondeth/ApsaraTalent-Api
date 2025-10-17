import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SALT_ROUNDS } from 'utils/constants/password.constant';
import * as bcrypt from 'bcrypt';
import { EUserRole } from '../enums/user-role.enum';
import { ELoginMethod } from '../enums/login-method.enum';
import { Employee } from './employee/employee.entity';
import { Company } from './company/company.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: EUserRole })
  role: EUserRole;

  @OneToOne(() => Employee, (employee) => employee.user)
  employee: Employee;

  @OneToOne(() => Company, (company) => company.user)
  company: Company;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: true }) //Optional for social login and OTP Login
  password: string;

  @BeforeInsert()
  async hashPassword() {
    if (this.password)
      this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
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
