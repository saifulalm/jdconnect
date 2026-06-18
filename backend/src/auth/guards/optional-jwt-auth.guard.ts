import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard but never blocks: if a valid token is present the user is
 * attached to the request, otherwise the request proceeds as a guest.
 * Used by loginless endpoints that optionally link an order to an account.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  // Swallow auth errors -> treat as anonymous.
  handleRequest(_err: any, user: any) {
    return user || undefined;
  }
}
