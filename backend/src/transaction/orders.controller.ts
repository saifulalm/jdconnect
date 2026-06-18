import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TransactionService } from './transaction.service';
import { CreateGuestOrderDto } from './dto/create-guest-order.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

/**
 * Public, loginless checkout. Guests create an order, pay via the gateway,
 * and track it by invoice + last 4 digits of the destination number.
 * If a valid JWT is present the order is linked to that account.
 */
@Controller('orders')
export class OrdersController {
  constructor(private readonly transactionService: TransactionService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('guest')
  async createGuestOrder(@Body() dto: CreateGuestOrderDto, @Req() req: any) {
    const result = await this.transactionService.createGuestOrder({
      ...dto,
      userId: req.user?.id,
    });
    return {
      invoiceNumber: result.transaction.invoiceNumber,
      amount: Number(result.transaction.price),
      status: result.transaction.status,
      paymentStatus: result.transaction.paymentStatus,
      payment: result.payment,
    };
  }

  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get('track/:invoiceNumber')
  async track(
    @Param('invoiceNumber') invoiceNumber: string,
    @Query('phone') phoneLast4: string,
  ) {
    const trx = await this.transactionService.trackGuestOrder(invoiceNumber, phoneLast4 || '');
    return {
      invoiceNumber: trx.invoiceNumber,
      product: trx.product?.name,
      provider: trx.provider,
      phoneNumber: this.mask(trx.phoneNumber),
      amount: Number(trx.price),
      status: trx.status,
      paymentStatus: trx.paymentStatus,
      serialNumber: trx.serialNumber,
      message: trx.supplierMessage,
      createdAt: trx.createdAt,
    };
  }

  private mask(phone: string): string {
    if (phone.length <= 4) return phone;
    return phone.slice(0, 4) + '****' + phone.slice(-3);
  }
}
