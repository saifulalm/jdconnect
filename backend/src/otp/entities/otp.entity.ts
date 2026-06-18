import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum OtpPurpose {
  LOGIN = 'login',
  CHECKOUT = 'checkout',
  VERIFY_PHONE = 'verify_phone',
}

@Entity('otp_codes')
@Index(['phoneNumber', 'purpose'])
export class OtpCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  phoneNumber: string;

  @Column({ type: 'simple-enum', enum: OtpPurpose, default: OtpPurpose.LOGIN })
  purpose: OtpPurpose;

  // Hashed code (never store plaintext).
  @Column()
  codeHash: string;

  @Column()
  expiresAt: Date;

  @Column({ default: 0 })
  attempts: number;

  @Column({ default: false })
  consumed: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
