import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Product } from '../../product/entities/product.entity';

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TransactionType {
  PULSA = 'pulsa',
  DATA = 'data',
  PLN = 'pln',
  GAME = 'game',
  EWALLET = 'ewallet',
}

// How the order is funded.
export enum TransactionChannel {
  BALANCE = 'balance', // logged-in user pays from wallet
  GATEWAY = 'gateway', // guest/user pays via payment gateway (Midtrans)
}

/** Whether money still has to travel back to the customer. */
export enum RefundStatus {
  NONE = 'none',
  PENDING = 'pending', // owed to the customer, not yet sent
  DONE = 'done',
  REJECTED = 'rejected',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PENDING = 'pending',
  PAID = 'paid',
  EXPIRED = 'expired',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

// Lookups happen on invoice (tracking), supplierRef (callbacks), userId
// (history) and status (admin filters) — all of which were full table scans.
@Entity('transactions')
@Index(['userId', 'createdAt'])
@Index(['status'])
@Index(['createdAt'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Unique at the database level: application-generated ids alone are not a
  // guarantee, and a collision would corrupt tracking and reconciliation.
  @Column({ unique: true })
  invoiceNumber: string;

  /**
   * Caller-supplied idempotency key (H2H `client_ref`). A dedicated, indexed
   * column — the previous lookup queried inside the `metadata` json blob,
   * which Postgres rejected, so retries silently created duplicate orders.
   */
  @Index({ unique: true, where: '"client_ref" IS NOT NULL' })
  @Column({ nullable: true })
  clientRef?: string;

  // Nullable: guest (loginless) orders have no user account.
  @Column({ nullable: true })
  userId?: string;

  @Column({
    type: 'simple-enum',
    enum: TransactionChannel,
    default: TransactionChannel.GATEWAY,
  })
  channel: TransactionChannel;

  // Guest contact details (loginless checkout).
  @Column({ nullable: true })
  customerEmail?: string;

  @Column({ nullable: true })
  customerName?: string;

  @Column({
    type: 'simple-enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @ManyToOne(() => Product, { eager: false })
  product: Product;

  @Column()
  productId: string;

  @Column()
  provider: string;

  @Column()
  phoneNumber: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({
    type: 'simple-enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ nullable: true })
  paymentMethod: string;

  @Column({ nullable: true })
  paymentVaNumber: string;

  @Column({ nullable: true })
  externalId: string;

  // Payment gateway state (Midtrans).
  @Column({
    type: 'simple-enum',
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
  })
  paymentStatus: PaymentStatus;

  @Column({ nullable: true })
  paymentToken?: string; // Midtrans Snap token

  @Column({ nullable: true })
  paymentRedirectUrl?: string;

  @Column({ nullable: true })
  paidAt?: Date;

  /**
   * Set when a paid gateway order failed at the supplier. The money has not
   * moved back yet, so it must not be recorded as REFUNDED.
   */
  @Index()
  @Column({
    type: 'simple-enum',
    enum: RefundStatus,
    default: RefundStatus.NONE,
  })
  refundStatus: RefundStatus;

  @Column({ nullable: true })
  refundedAt?: Date;

  @Column({ nullable: true })
  refundNote?: string;

  // Upstream supplier (H2H) execution state.
  @Column({ nullable: true })
  supplierDriver?: string; // digiflazz | mock | ...

  @Index()
  @Column({ nullable: true })
  supplierRef?: string; // ref_id sent to supplier

  @Column({ nullable: true })
  serialNumber?: string; // SN / token returned by supplier

  @Column({ nullable: true })
  supplierMessage?: string;

  @Column({ default: 0 })
  topupAttempts: number;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  notes: string;

  // Tax fields
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  taxRate: number; // percent applied at transaction time

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  taxAmount: number; // tax amount included in price

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
