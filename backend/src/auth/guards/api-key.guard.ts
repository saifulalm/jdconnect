import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { UserService } from '../../user/user.service';
import { NonceService } from '../nonce.service';
import { timingSafeEqualHex } from '../../common/crypto.util';
import * as crypto from 'crypto';

/** How far a request timestamp may drift from server time. */
const TIMESTAMP_WINDOW_MS = 5 * 60 * 1000;

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private nonceService: NonceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const signature = request.headers['x-api-signature'];
    const timestamp = request.headers['x-api-timestamp'];

    if (!apiKey || !signature || !timestamp) {
      throw new UnauthorizedException(
        'Missing API credentials (x-api-key, x-api-signature, x-api-timestamp)',
      );
    }

    // Timestamp window — bounds how long a captured request stays usable.
    const now = Date.now();
    const requestTime = parseInt(timestamp, 10);
    if (isNaN(requestTime) || Math.abs(now - requestTime) > TIMESTAMP_WINDOW_MS) {
      throw new UnauthorizedException('Request timestamp expired or invalid');
    }

    const user = await this.userService.findByApiKey(apiKey);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid or inactive API Key');
    }
    if (!user.apiSecret) {
      throw new UnauthorizedException('API secret not set for this key');
    }

    // IP whitelist. request.ip honours X-Forwarded-For only when the app is
    // started with trust proxy set (TRUST_PROXY env) — otherwise every client
    // behind a load balancer would share the proxy's address.
    if (user.ipWhitelist) {
      const allowedIps = user.ipWhitelist
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean);
      if (allowedIps.length) {
        const clientIp = this.normalizeIp(request.ip || request.socket?.remoteAddress);
        const allowed = allowedIps.some((ip) => this.normalizeIp(ip) === clientIp);
        if (!allowed) {
          throw new ForbiddenException(`IP ${clientIp} not whitelisted`);
        }
      }
    }

    // Signature: HMAC-SHA256(apiKey + JSON.stringify(body) + timestamp, apiSecret)
    const body = request.body || {};
    const dataToSign = apiKey + JSON.stringify(body) + timestamp;
    const expectedSignature = crypto
      .createHmac('sha256', user.apiSecret)
      .update(dataToSign)
      .digest('hex');

    // Constant-time compare: `!==` leaks the matching prefix length via timing.
    if (!timingSafeEqualHex(expectedSignature, String(signature))) {
      throw new UnauthorizedException('Invalid API signature');
    }

    // Replay protection. The timestamp window alone allowed an identical
    // signed request to be sent repeatedly, each copy creating a new
    // transaction. A client may supply its own x-api-nonce; otherwise the
    // signature itself is the single-use token.
    const nonce = String(request.headers['x-api-nonce'] || signature);
    const fresh = await this.nonceService.claim(apiKey, nonce, TIMESTAMP_WINDOW_MS * 2);
    if (!fresh) {
      throw new UnauthorizedException('Duplicate request (replay detected)');
    }

    request.user = user;
    return true;
  }

  /** Strip the IPv6-mapped IPv4 prefix so ::ffff:1.2.3.4 matches 1.2.3.4. */
  private normalizeIp(ip?: string): string {
    if (!ip) return '';
    return ip.replace(/^::ffff:/, '').trim();
  }
}
