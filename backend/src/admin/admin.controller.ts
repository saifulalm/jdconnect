import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
}
