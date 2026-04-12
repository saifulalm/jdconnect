import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles/role.enum';
import { AdminTopupDto } from './dto/admin-topup.dto';
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
  ) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('transactions')
  async getTransactions() {
    return this.adminService.getTransactions();
  }

  @Get('users')
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Get('revenue')
  async getRevenue() {
    return this.adminService.getRevenue();
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
