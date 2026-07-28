import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { TransactionService } from './transaction.service';
import { CreateGuestOrderDto } from './dto/create-guest-order.dto';
import { ClaimOrdersDto } from './dto/claim-orders.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { OtpService } from '../otp/otp.service';
import { OtpPurpose } from '../otp/entities/otp.entity';
import { UserService } from '../user/user.service';
import { AuthService } from '../auth/auth.service';
import { Role } from '../auth/roles/role.enum';

/**
 * Public, loginless checkout. Guests create an order, pay via the gateway,
 * and track it by invoice + last 4 digits of the destination number.
 * If a valid JWT is present the order is linked to that account.
 */
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly otpService: OtpService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Loginless -> account bridge: prove ownership of the destination number
   * with an OTP, then attach every guest order placed with it. Creates the
   * account on first claim so the guest never fills a signup form.
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('claim')
  async claimOrders(@Body() dto: ClaimOrdersDto) {
    await this.otpService.verify(dto.phoneNumber, dto.code, OtpPurpose.VERIFY_PHONE);

    const digits = dto.phoneNumber.replace(/\D/g, '');
    const local = digits.startsWith('62') ? '0' + digits.slice(2) : digits;

    let user = await this.userService.findByPhone(local);
    let created = false;
    if (!user) {
      // Passwordless account: a random password is set so the row is valid;
      // the owner signs in with OTP or sets a password later.
      user = await this.userService.create({
        email: `${local}@phone.jdconnect.id`,
        password: crypto.randomBytes(24).toString('hex'),
        name: dto.name?.trim() || `Pengguna ${local.slice(-4)}`,
        phone: local,
        role: Role.CUSTOMER,
      });
      created = true;
    }

    const claimed = await this.transactionService.claimGuestOrders(user.id, local);
    const session = await this.authService.login(user);

    return { ...session, claimed, accountCreated: created };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
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

  // The tracking page polls every 4s while an order settles (~15 req/min per
  // visitor), so a shared office IP hits a low cap quickly. Read-only and
  // guarded by the phone-digit check.
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @Get('track/:invoiceNumber')
  async track(
    @Param('invoiceNumber') invoiceNumber: string,
    @Query('phone') phoneLast4: string,
  ) {
    const trx = await this.transactionService.trackGuestOrder(invoiceNumber, phoneLast4 || '');
    const awaitingQris =
      trx.paymentMethod === 'qris' &&
      (trx.paymentStatus === 'pending' || trx.paymentStatus === 'unpaid');
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
      // Re-serve the dynamic QRIS payload while payment is outstanding.
      qrString: awaitingQris ? trx.paymentToken : undefined,
      createdAt: trx.createdAt,
    };
  }

  private mask(phone: string): string {
    if (phone.length <= 4) return phone;
    return phone.slice(0, 4) + '****' + phone.slice(-3);
  }
}
