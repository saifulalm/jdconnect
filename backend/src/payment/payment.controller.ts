import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentService } from './payment.service';
import { TransactionService } from '../transaction/transaction.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles/role.enum';
import { ObservabilityService } from '../observability/observability.service';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly transactionService: TransactionService,
    private readonly observability: ObservabilityService,
  ) {}

  /** Public client config for the frontend Snap embed. */
  @Get('config')
  config() {
    return {
      gateway: this.paymentService.gatewayName,
      clientKey: this.paymentService.clientKeyPublic,
      isProduction: this.paymentService.gatewayName === 'midtrans',
    };
  }

  /**
   * Midtrans HTTP notification (server-to-server).
   *
   * Deliberately far above the per-IP default: every callback arrives from
   * the gateway's own address, so a settlement burst would otherwise be
   * throttled and those payments would silently never reach the supplier.
   * Abuse is bounded by the mandatory signature check, not by this limit.
   */
  @Throttle({ default: { limit: 1200, ttl: 60000 } })
  @Post('midtrans/callback')
  async midtransCallback(@Body() payload: any) {
    const result = this.paymentService.verifyAndParseWebhook(payload);
    if (!result) return { status: 'invalid_signature' };
    await this.transactionService.handlePaymentResult(result);
    return { status: 'ok' };
  }

  /**
   * Dev-only helper: simulate a successful payment when running with the mock
   * gateway. Lets the full flow be demoed end-to-end without a gateway.
   *
   * SECURITY: this settles an order for free, so it must never be reachable
   * outside development. It used to be public with no environment check —
   * only a "disabled when Midtrans is configured" guard, which left it wide
   * open on any QRIS or mock deployment.
   */
  @Post('mock-pay/:invoiceNumber')
  async mockPay(@Param('invoiceNumber') invoiceNumber: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    if (this.paymentService.gatewayName !== 'mock') {
      throw new ForbiddenException(
        `Mock pay is only available with the mock gateway (active: ${this.paymentService.gatewayName})`,
      );
    }
    await this.transactionService.handlePaymentResult({
      orderId: invoiceNumber,
      paid: true,
      failed: false,
      pending: false,
      paymentMethod: 'mock',
    });
    return { status: 'ok' };
  }

  /**
   * Manual settlement for the open-source qris-static driver: an admin
   * verifies the mutation in their banking/e-wallet app, then confirms here.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERACCESS)
  @Post('confirm/:invoiceNumber')
  async confirmManual(@Param('invoiceNumber') invoiceNumber: string, @Req() req) {
    await this.observability.logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'payment.manual_confirm',
      targetType: 'transaction',
      targetId: invoiceNumber,
      detail: { gateway: this.paymentService.gatewayName },
      ip: req.ip,
    });
    await this.transactionService.handlePaymentResult({
      orderId: invoiceNumber,
      paid: true,
      failed: false,
      pending: false,
      paymentMethod: 'qris',
    });
    return { status: 'ok', invoiceNumber };
  }

  @Get('status/:invoiceNumber')
  async checkStatus(@Param('invoiceNumber') invoiceNumber: string) {
    const result = await this.paymentService.checkStatus(invoiceNumber);
    if (result) await this.transactionService.handlePaymentResult(result);
    return result || { status: 'unknown' };
  }
}
