import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../user.entity';
import { Company } from '../company/company.entity';
import { PaymentTransaction, Currency } from './payment-transaction.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  EXPIRED = 'expired',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum PaymentType {
  INDIVIDUAL = 'individual',
  MERCHANT = 'merchant',
}

// Currency enum is now defined in payment-transaction.entity.ts to avoid circular dependencies

@Entity('payments')
@Index(['md5Hash'], { unique: true })
@Index(['qrString'], { unique: true })
@Index(['status'])
@Index(['userId'])
@Index(['companyId'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'md5_hash', length: 32, unique: true })
  md5Hash: string;

  @Column({ name: 'qr_string', type: 'text', unique: true })
  qrString: string;

  @Column({ name: 'qr_image', type: 'text', nullable: true })
  qrImage: string;

  @Column({
    type: 'enum',
    enum: PaymentType,
    name: 'payment_type',
  })
  paymentType: PaymentType;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  // Payment Details
  @Column({ name: 'bakong_account_id' })
  bakongAccountId: string;

  @Column({ name: 'merchant_name' })
  merchantName: string;

  @Column({ name: 'merchant_city' })
  merchantCity: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  amount: number;

  @Column({
    type: 'enum',
    enum: Currency,
    default: Currency.KHR,
  })
  currency: Currency;

  @Column({ name: 'bill_number', nullable: true })
  billNumber: string;

  @Column({ name: 'mobile_number', nullable: true })
  mobileNumber: string;

  @Column({ name: 'store_label', nullable: true })
  storeLabel: string;

  @Column({ name: 'terminal_label', nullable: true })
  terminalLabel: string;

  // Merchant-specific fields
  @Column({ name: 'merchant_id', nullable: true })
  merchantId: string;

  @Column({ name: 'acquiring_bank', nullable: true })
  acquiringBank: string;

  // Static/Dynamic QR
  @Column({ name: 'is_static', default: false })
  isStatic: boolean;

  // Expiration
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  // Deep Link
  @Column({ name: 'deep_link', type: 'text', nullable: true })
  deepLink: string;

  @Column({ name: 'short_url', nullable: true })
  shortUrl: string;

  // Relationships
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  // Transactions related to this payment
  @OneToMany(() => PaymentTransaction, (transaction) => transaction.payment)
  transactions: PaymentTransaction[];

  // Metadata
  @Column({ name: 'callback_url', nullable: true })
  callbackUrl: string;

  @Column({ name: 'app_name', nullable: true })
  appName: string;

  @Column({ name: 'app_icon_url', nullable: true })
  appIconUrl: string;

  // Additional tracking
  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
