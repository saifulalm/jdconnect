import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { TransactionService } from '../transaction/transaction.service';
import { TransactionStatus } from '../transaction/entities/transaction.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles/role.enum';
import { AdminTopupDto } from './dto/admin-topup.dto';
import { AdminUpdateUserDto } from '../user/dto/update-user.dto';
import { UserService } from '../user/user.service';
import { BalanceChangeType } from '../user/entities/balance-history.entity';
import * as crypto from 'crypto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERACCESS)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly userService: UserService,
    private readonly transactionService: TransactionService,
  ) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('transactions')
  async getTransactions(@Query('limit') limit?: string) {
    return this.adminService.getTransactions(limit ? Number(limit) : 100);
  }

  /** Manual status override for stuck orders. */
  @Patch('transactions/:id/status')
  async setTransactionStatus(@Param('id') id: string, @Body('status') status: TransactionStatus) {
    return this.transactionService.updateStatus(id, status);
  }

  /** Re-run the supplier top-up for a paid order that failed to dispatch. */
  @Post('transactions/:id/retry')
  async retryTopup(@Param('id') id: string) {
    return this.transactionService.executeTopup(id);
  }

  @Get('users')
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Get('revenue')
  async getRevenue() {
    return this.adminService.getRevenue();
  }

  /**
   * Privileged user changes (role, activation). Separate from the
   * self-service PATCH /users/:id, which must never accept these fields.
   */
  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
    @Req() req,
  ) {
    // Don't let an admin lock themselves out or drop their own privileges.
    if (id === req.user.id && (dto.isActive === false || dto.role)) {
      throw new BadRequestException('Tidak dapat mengubah role atau status akun sendiri');
    }
    const user = await this.userService.update(id, dto);
    if (!user) throw new NotFoundException('User not found');
    const { password, ...safe } = user as any;
    return { status: 'success', data: safe };
  }

  @Post('topup')
  async topupDeposit(@Body() dto: AdminTopupDto, @Req() req) {
    const referenceId = `admin-topup:${req.user.id}:${crypto.randomUUID()}`;
    const user = await this.userService.updateBalance(
      dto.userId,
      dto.amount,
      BalanceChangeType.TOPUP,
      referenceId,
      dto.description || 'Admin topup deposit',
    );

    return {
      status: 'success',
      data: {
        userId: user.id,
        balance: user.balance,
        referenceId,
      },
    };
  }
}
