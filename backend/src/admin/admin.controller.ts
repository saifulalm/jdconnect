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
import { ObservabilityService } from '../observability/observability.service';
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
    private readonly observability: ObservabilityService,
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
  async setTransactionStatus(
    @Param('id') id: string,
    @Body('status') status: TransactionStatus,
    @Req() req,
  ) {
    const before = await this.transactionService.findById(id);
    const result = await this.transactionService.updateStatus(id, status);
    await this.observability.logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'transaction.status_override',
      targetType: 'transaction',
      targetId: id,
      detail: { invoice: before?.invoiceNumber, from: before?.status, to: status },
      ip: req.ip,
    });
    return result;
  }

  /** Re-run the supplier top-up for a paid order that failed to dispatch. */
  @Post('transactions/:id/retry')
  async retryTopup(@Param('id') id: string, @Req() req) {
    const result = await this.transactionService.executeTopup(id);
    await this.observability.logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'transaction.retry_topup',
      targetType: 'transaction',
      targetId: id,
      detail: { invoice: result?.invoiceNumber, status: result?.status },
      ip: req.ip,
    });
    return result;
  }

  /**
   * Close out a refund the operator has actually paid back. Kept explicit:
   * the system cannot know the money moved, so a human records it.
   */
  @Patch('transactions/:id/refund')
  async settleRefund(
    @Param('id') id: string,
    @Body('note') note: string,
    @Req() req,
  ) {
    const result = await this.transactionService.markRefundSettled(id, note);
    await this.observability.logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'refund.settled',
      targetType: 'transaction',
      targetId: id,
      detail: { invoice: result.invoiceNumber, amount: Number(result.price), note },
      ip: req.ip,
    });
    return result;
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
    const before = await this.userService.findById(id);
    const user = await this.userService.update(id, dto);
    if (!user) throw new NotFoundException('User not found');
    await this.observability.logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: dto.role ? 'user.role_change' : 'user.activation_change',
      targetType: 'user',
      targetId: id,
      detail: {
        targetEmail: before?.email,
        roleFrom: before?.role,
        roleTo: dto.role,
        activeFrom: before?.isActive,
        activeTo: dto.isActive,
      },
      ip: req.ip,
    });
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

    await this.observability.logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'user.balance_topup',
      targetType: 'user',
      targetId: dto.userId,
      detail: { amount: dto.amount, balanceAfter: user.balance, referenceId, note: dto.description },
      ip: req.ip,
    });

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
