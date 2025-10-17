import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Payment } from './payment.entity';
import { User } from '../user.entity';

export enum Currency {
  KHR = 'KHR',
  USD = 'USD',
}

export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  CHARGEBACK = 'chargeback',
}

@Entity('payment_transactions')
@Index(['transactionId'], { unique: true })
@Index(['paymentId'])
@Index(['status'])
@Index(['transactionType'])
@Index(['createdAt'])
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Bakong transaction ID
  @Column({ name: 'transaction_id', unique: true, nullable: true })
  transactionId: string;

  // Reference to the original payment
  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId: string;

  @ManyToOne(() => Payment, (payment) => payment.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  // Transaction details
  @Column({
    type: 'enum',
    enum: TransactionType,
    name: 'transaction_type',
    default: TransactionType.PAYMENT,
  })
  transactionType: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: Currency,
  })
  currency: Currency;

  // Fee information
  @Column({
    name: 'fee_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  feeAmount: number;

  @Column({
    name: 'net_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  netAmount: number;

  // Exchange rate if currency conversion occurred
  @Column({
    name: 'exchange_rate',
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
  })
  exchangeRate: number;

  @Column({
    name: 'original_currency',
    type: 'varchar',
    length: 3,
    nullable: true,
  })
  originalCurrency: string;

  @Column({
    name: 'original_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  originalAmount: number;

  // Payer information (from Bakong response)
  @Column({ name: 'payer_name', nullable: true })
  payerName: string;

  @Column({ name: 'payer_phone', nullable: true })
  payerPhone: string;

  @Column({ name: 'payer_bank_code', nullable: true })
  payerBankCode: string;

  @Column({ name: 'payer_account_id', nullable: true })
  payerAccountId: string;

  // If the transaction was initiated by a registered user
  @Column({ name: 'payer_user_id', type: 'uuid', nullable: true })
  payerUserId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'payer_user_id' })
  payerUser: User;

  // Timestamps from Bakong
  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt: Date;

  @Column({ name: 'failed_at', type: 'timestamp', nullable: true })
  failedAt: Date;

  // Error information
  @Column({ name: 'error_code', nullable: true })
  errorCode: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  // Bakong response data
  @Column({ name: 'bakong_response', type: 'jsonb', nullable: true })
  bakongResponse: any;

  // Webhook information
  @Column({ name: 'webhook_delivered', default: false })
  webhookDelivered: boolean;

  @Column({ name: 'webhook_delivered_at', type: 'timestamp', nullable: true })
  webhookDeliveredAt: Date;

  @Column({ name: 'webhook_attempts', type: 'int', default: 0 })
  webhookAttempts: number;

  // Reference numbers
  @Column({ name: 'reference_number', nullable: true })
  referenceNumber: string;

  @Column({ name: 'trace_number', nullable: true })
  traceNumber: string;

  // Settlement information
  @Column({ name: 'settled_at', type: 'timestamp', nullable: true })
  settledAt: Date;

  @Column({ name: 'settlement_batch_id', nullable: true })
  settlementBatchId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
