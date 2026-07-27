import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { TransactionService } from '../transaction/transaction.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles/role.enum';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly transactionService: TransactionService,
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

  /** Midtrans HTTP notification (server-to-server). */
  @Post('midtrans/callback')
  async midtransCallback(@Body() payload: any) {
    const result = this.paymentService.verifyAndParseWebhook(payload);
    if (!result) return { status: 'invalid_signature' };
    await this.transactionService.handlePaymentResult(result);
    return { status: 'ok' };
  }

  /**
   * Dev-only helper: simulate a successful payment when running with the mock
   * gateway (no Midtrans keys). Lets the full flow be demoed end-to-end.
   */
  @Post('mock-pay/:invoiceNumber')
  async mockPay(@Param('invoiceNumber') invoiceNumber: string) {
    if (this.paymentService.isConfigured()) {
      return { status: 'disabled', message: 'Mock pay disabled when a real gateway is configured' };
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
  async confirmManual(@Param('invoiceNumber') invoiceNumber: string) {
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
