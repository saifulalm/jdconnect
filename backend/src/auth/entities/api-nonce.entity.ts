import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

/**
 * One-time request markers for the H2H API.
 *
 * The timestamp window alone does not stop replays: an identical signed
 * request could be sent repeatedly within the window and each copy created a
 * new transaction. Storing the signature (unique) makes every request
 * single-use. Backed by the database rather than memory so it holds across
 * restarts and multiple instances.
 */
@Entity('api_nonces')
@Unique('UQ_api_nonce', ['apiKey', 'nonce'])
export class ApiNonce {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  apiKey: string;

  /** Request signature (or a client-supplied nonce header). */
  @Column()
  nonce: string;

  @Index()
  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
