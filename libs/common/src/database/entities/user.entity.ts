import * as bcrypt from 'bcrypt';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SALT_ROUNDS } from '@app/contracts/constants/domain/password.constant';
import { ELoginMethod } from '../enums/login-method.enum';
import { EUserRole } from '../enums/user-role.enum';
import { Company } from './company/company.entity';
import { Employee } from './employee/employee.entity';

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
  otpCode: string | null;

  @Column({ nullable: true })
  otpCodeExpires: Date | null;

  @Column({ nullable: true }) // For push notifications services
  pushNotificationToken: string | null;

  @Column({ default: false })
  profileCompleted: boolean;

  // Auth related fields
  @Column({ nullable: true })
  resetPasswordToken: string | null;

  @Column({ nullable: true })
  resetPasswordExpires: Date | null;

  @Column({ nullable: true })
  refreshToken: string | null;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  emailVerificationToken: string | null;

  @Column({ default: false })
  isTwoFactorEnabled: boolean;

  @Column({ nullable: true })
  twoFactorSecret: string | null;

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
