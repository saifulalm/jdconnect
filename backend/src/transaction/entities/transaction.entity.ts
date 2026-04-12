import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
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

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  invoiceNumber: string;

  @Column()
  userId: string;

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
