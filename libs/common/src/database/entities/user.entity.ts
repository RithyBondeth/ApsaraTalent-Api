import * as bcrypt from 'bcrypt';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SALT_ROUNDS } from '@app/contracts/constants/domain/password.constant';
import { ELoginMethod } from '../enums/login-method.enum';
import { EUserRole } from '../enums/user-role.enum';
import { EUserStatus } from '../enums/user-status.enum';
import { Company } from './company/company.entity';
import { Employee } from './employee/employee.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: EUserRole })
  role: EUserRole;

  /**
   * Whether this account may sign in and use the platform. Enforced in
   * `AuthGuard` (every authenticated request) and in the login services, so a
   * suspension takes effect without waiting for the access token to expire.
   */
  @Index()
  @Column({ type: 'enum', enum: EUserStatus, default: EUserStatus.ACTIVE })
  status: EUserStatus;

  /**
   * When a suspension lifts on its own. Null means "until an admin lifts it".
   * Checked rather than swept by a job: `resolveEffectiveStatus` treats a
   * past date as active, so an expiry needs no scheduler to come into effect.
   */
  @Column({ type: 'timestamptz', nullable: true })
  suspendedUntil: Date | null;

  /** Shown to the user when they are turned away, so keep it presentable. */
  @Column({ type: 'text', nullable: true })
  statusReason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  statusChangedAt: Date | null;

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

  /** Six-digit email verification code. Null once verified or expired. */
  @Column({ nullable: true })
  emailVerificationOtp: string | null;

  @Column({ nullable: true })
  emailVerificationOtpExpires: Date | null;

  /** Wrong guesses against the current code; the code is burned at the cap. */
  @Column({ default: 0 })
  emailVerificationAttempts: number;

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
