import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService {
  private readonly client: Redis | null;

  constructor(private configService: ConfigService) {
    const enabled = this.configService.get<string>('ENABLE_REDIS', 'true') === 'true';
    if (!enabled) {
      this.client = null;
      return;
    }

    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      const useTls =
        redisUrl.startsWith('rediss://') || this.configService.get<string>('REDIS_TLS', 'false') === 'true';

      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        tls: useTls ? { rejectUnauthorized: false } : undefined,
      });
      this.client.on('error', () => undefined);
      return;
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (nodeEnv === 'production') {
      this.client = null;
      return;
    }

    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    });
    this.client.on('error', () => undefined);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.client) return;
    if (ttl) {
      try {
        await this.client.setex(key, ttl, value);
      } catch {
        return;
      }
    } else {
      try {
        await this.client.set(key, value);
      } catch {
        return;
      }
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch {
      return;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch {
      return false;
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.incr(key);
    } catch {
      return 0;
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.expire(key, ttl);
    } catch {
      return;
    }
  }

  async close(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch {
      return;
    }
  }
}
