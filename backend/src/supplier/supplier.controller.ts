import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles/role.enum';
import { TransactionService } from '../transaction/transaction.service';

@Controller('supplier')
export class SupplierController {
  constructor(
    private readonly supplierService: SupplierService,
    private readonly transactionService: TransactionService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERACCESS)
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
  async syncPriceList() {
    return this.supplierService.syncPriceList();
  }

  /**
   * Async callback from supplier (e.g. Digiflazz) when a top-up settles.
   * Public endpoint — authenticity comes from the signed payload.
   */
  @Post('callback')
  async callback(@Body() payload: any, @Headers('x-hub-signature') signature?: string) {
    const result = this.supplierService.parseCallback(payload, signature);
    if (!result) return { status: 'ignored' };
    await this.transactionService.applySupplierResult(result);
    return { status: 'ok' };
  }
}
