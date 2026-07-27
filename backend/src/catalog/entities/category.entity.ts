import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Storefront category configuration — drives the checkout tabs, the customer
 * number field (label/placeholder/validation) and whether operator detection
 * applies. Fully admin-editable so the UI can change without a deploy.
 */
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Matches Product.category (pulsa | data | pln | game | ewallet | ...). */
  @Column({ unique: true })
  key: string;

  @Column()
  label: string;

  @Column({ nullable: true })
  description?: string;

  /** Lucide icon name resolved on the frontend (e.g. "Smartphone"). */
  @Column({ default: 'Zap' })
  icon: string;

  // --- customer number field -------------------------------------------------
  @Column({ default: 'Nomor Tujuan' })
  inputLabel: string;

  @Column({ default: '0812 3456 7890' })
  inputPlaceholder: string;

  @Column({ nullable: true })
  inputHelp?: string;

  @Column({ default: 4 })
  minLength: number;

  @Column({ default: 16 })
  maxLength: number;

  /** Show the detected operator badge and filter products by provider. */
  @Column({ default: false })
  detectOperator: boolean;

  /** Extra field for game top-ups (server / zone id). */
  @Column({ default: false })
  requiresServerId: boolean;

  @Column({ nullable: true })
  serverIdLabel?: string;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
