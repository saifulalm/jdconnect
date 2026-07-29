import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum SupplierLogKind {
  TOPUP = 'topup',
  STATUS = 'status',
  BALANCE = 'balance',
  PRICE_LIST = 'price_list',
  CALLBACK = 'callback',
}

/**
 * One row per interaction with an upstream supplier.
 *
 * Without this there is no evidence in a dispute ("we never received that
 * transaction"), no way to debug a failed top-up after the fact, and no data
 * to compute latency or success rate per supplier.
 */
@Entity('supplier_logs')
@Index(['driver', 'kind'])
export class SupplierLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  driver: string; // digiflazz | mock | ...

  @Column({ type: 'simple-enum', enum: SupplierLogKind })
  kind: SupplierLogKind;

  /** Our reference (invoice / ref_id) when the call belongs to an order. */
  @Index()
  @Column({ nullable: true })
  refId?: string;

  @Column({ nullable: true })
  sku?: string;

  /** Destination number, stored masked — never the full customer number. */
  @Column({ nullable: true })
  customerNo?: string;

  @Column({ default: false })
  success: boolean;

  /** Mapped result: success | failed | pending. */
  @Column({ nullable: true })
  resultStatus?: string;

  @Column({ nullable: true })
  message?: string;

  /** Round-trip time in milliseconds — the basis for latency reporting. */
  @Column({ type: 'int', default: 0 })
  durationMs: number;

  /** Raw request/response, credentials stripped before storing. */
  @Column({ type: 'json', nullable: true })
  request?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  response?: Record<string, any>;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
