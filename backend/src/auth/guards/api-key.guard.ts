import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { UserService } from '../../user/user.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const signature = request.headers['x-api-signature'];
    const timestamp = request.headers['x-api-timestamp'];

    if (!apiKey || !signature || !timestamp) {
      throw new UnauthorizedException('Missing API credentials (x-api-key, x-api-signature, x-api-timestamp)');
    }

    // Check if timestamp is within a reasonable window (e.g. 5 minutes) to prevent replay attacks
    const now = Date.now();
    const requestTime = parseInt(timestamp, 10);
    if (isNaN(requestTime) || Math.abs(now - requestTime) > 5 * 60 * 1000) {
      throw new UnauthorizedException('Request timestamp expired or invalid');
    }

    const user = await this.userService.findByApiKey(apiKey);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid or inactive API Key');
    }

    // IP Whitelisting
    if (user.ipWhitelist) {
      const allowedIps = user.ipWhitelist.split(',').map(ip => ip.trim());
      const clientIp = request.ip || request.connection.remoteAddress;
      // Note: In production, consider proxy headers if behind a LB
      if (!allowedIps.includes(clientIp)) {
        throw new ForbiddenException(`IP ${clientIp} not whitelisted`);
      }
    }

    // Signature Verification
    // Format: HMAC-SHA256(apiKey + JSON.stringify(body) + timestamp, apiSecret)
    const body = request.body || {};
    const dataToSign = apiKey + JSON.stringify(body) + timestamp;
    const expectedSignature = crypto
      .createHmac('sha256', user.apiSecret)
      .update(dataToSign)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid API signature');
    }

    // Attach user to request
    request.user = user;
    return true;
  }
}
