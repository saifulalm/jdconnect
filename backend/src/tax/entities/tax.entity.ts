import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tax_settings')
export class TaxSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 11.00 })
  rate: number;

  @Column({
    type: (process.env.NODE_ENV === 'test' ? 'datetime' : 'timestamptz') as any,
    default: () => 'CURRENT_TIMESTAMP',
  })
  effectiveFrom: Date;

  @Column({
    type: (process.env.NODE_ENV === 'test' ? 'datetime' : 'timestamptz') as any,
    nullable: true,
  })
  effectiveTo: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
