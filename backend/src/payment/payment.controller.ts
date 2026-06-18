import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { TransactionService } from '../transaction/transaction.service';

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

  @Get('status/:invoiceNumber')
  async checkStatus(@Param('invoiceNumber') invoiceNumber: string) {
    const result = await this.paymentService.checkStatus(invoiceNumber);
    if (result) await this.transactionService.handlePaymentResult(result);
    return result || { status: 'unknown' };
  }
}
