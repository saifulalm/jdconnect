import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * MSISDN prefix -> provider mapping used to auto-detect the operator during
 * checkout. Admin-editable so new prefixes can be added without a deploy.
 */
@Entity('operator_prefixes')
@Index(['prefix'], { unique: true })
export class OperatorPrefix {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Local-format prefix, e.g. "0812". Stored normalised (leading 0). */
  @Column()
  prefix: string;

  /** Provider name — must match Product.provider for filtering to work. */
  @Column()
  provider: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
