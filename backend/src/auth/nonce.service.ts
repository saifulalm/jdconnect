import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ApiNonce } from './entities/api-nonce.entity';

@Injectable()
export class NonceService {
  private readonly logger = new Logger(NonceService.name);
  private lastSweep = 0;

  constructor(
    @InjectRepository(ApiNonce)
    private readonly repo: Repository<ApiNonce>,
  ) {}

  /**
   * Claim a nonce. Returns false when it has already been used, which means
   * the request is a replay and must be rejected.
   *
   * Uniqueness is enforced by the database, so two concurrent requests
   * carrying the same signature cannot both succeed.
   */
  async claim(apiKey: string, nonce: string, ttlMs: number): Promise<boolean> {
    try {
      await this.repo.insert({
        apiKey,
        nonce,
        expiresAt: new Date(Date.now() + ttlMs),
      });
      void this.sweep();
      return true;
    } catch (err: any) {
      // 23505 = unique_violation (Postgres); SQLite reports a constraint error.
      if (err?.code === '23505' || /UNIQUE|constraint/i.test(err?.message ?? '')) {
        return false;
      }
      throw err;
    }
  }

  /** Opportunistic cleanup — no scheduler in the project yet. */
  private async sweep(): Promise<void> {
    const now = Date.now();
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    try {
      await this.repo.delete({ expiresAt: LessThan(new Date()) });
    } catch (err: any) {
      this.logger.warn(`Nonce sweep failed: ${err.message}`);
    }
  }
}
