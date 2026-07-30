import { Body, Controller, Get, Headers, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SupplierService } from './supplier.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles/role.enum';
import { TransactionService } from '../transaction/transaction.service';
import { ObservabilityService } from '../observability/observability.service';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

@Controller('supplier')
export class SupplierController {
  constructor(
    private readonly supplierService: SupplierService,
    private readonly transactionService: TransactionService,
    private readonly observability: ObservabilityService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERACCESS)
  /** Every registered supplier with priority, config and breaker state. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERACCESS)
  @Get('list')
  listSuppliers() {
    return this.supplierService.listSuppliers();
  }

  /** Deposit balance for each supplier, so none runs dry unnoticed. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERACCESS)
  @Get('balances')
  getBalances() {
    return this.supplierService.getBalances();
  }

  @Get('balance')
  async getBalance() {
    return {
      driver: this.supplierService.driverName,
      balance: await this.supplierService.getBalance(),
      currency: 'IDR',
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERACCESS)
  @Post('sync')
  async syncPriceList(@Req() req: any, @Query('driver') driver?: string) {
    const result = await this.supplierService.syncPriceList(driver);
    await this.observability.logAudit({
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      actorRole: req.user?.role,
      action: 'supplier.price_sync',
      targetType: 'supplier',
      targetId: result.driver,
      detail: result,
      ip: req.ip,
    });
    return result;
  }

  /**
   * Async callback from supplier (e.g. Digiflazz) when a top-up settles.
   * Public endpoint — authenticity comes from the signed payload.
   */
  // Same reasoning as the payment callback: supplier settlement bursts come
  // from one address and must not be dropped. Signature verification is the
  // real gate here.
  @Throttle({ default: { limit: 1200, ttl: 60000 } })
  @Post('callback')
  async callback(
    @Body() payload: any,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature') signature?: string,
  ) {
    const result = this.supplierService.parseCallback(payload, signature, req.rawBody);
    if (!result) return { status: 'ignored' };
    await this.transactionService.applySupplierResult(result);
    return { status: 'ok' };
  }
}
