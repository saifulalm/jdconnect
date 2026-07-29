import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Append-only trail of privileged actions: who did what, to whom, from where.
 *
 * Balance top-ups, role changes and manual payment confirmations all move
 * money or grant power, and none of them left any record — insider misuse was
 * neither detectable nor provable.
 */
@Entity('audit_logs')
@Index(['createdAt'])
@Index(['actorId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  actorId?: string;

  @Column({ nullable: true })
  actorEmail?: string;

  @Column({ nullable: true })
  actorRole?: string;

  /** Dotted action name, e.g. "user.topup", "transaction.confirm_payment". */
  @Index()
  @Column()
  action: string;

  /** Type + id of the affected record. */
  @Column({ nullable: true })
  targetType?: string;

  @Index()
  @Column({ nullable: true })
  targetId?: string;

  /** Action-specific detail (amounts, before/after values). No secrets. */
  @Column({ type: 'json', nullable: true })
  detail?: Record<string, any>;

  @Column({ nullable: true })
  ip?: string;

  @Column({ default: true })
  success: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
