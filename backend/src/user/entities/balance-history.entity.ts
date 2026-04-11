import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum BalanceChangeType {
  TOPUP = 'topup',
  TRANSACTION = 'transaction',
  REFUND = 'refund',
  ADMIN_ADJUSTMENT = 'admin_adjustment',
}

@Entity('balance_history')
export class BalanceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number; // Positive for increase, negative for decrease

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balanceBefore: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balanceAfter: number;

  @Column({
    type: 'enum',
    enum: BalanceChangeType,
  })
  type: BalanceChangeType;

  @Column({ nullable: true })
  referenceId: string; // e.g. transactionId, topupId

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
