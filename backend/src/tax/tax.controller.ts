import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { TaxService } from './tax.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles/role.enum';

@Controller('tax')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Get('rate')
  async getTaxRate() {
    const rate = await this.taxService.getActiveTaxRate();
    return { rate };
  }

  // Admin only
  @Roles(Role.ADMIN, Role.SUPERACCESS)
  @Patch('rate')
  async setTaxRate(@Body() body: { rate: number }) {
    return await this.taxService.setTaxRate(body.rate);
  }

  @Get('settings')
  async getTaxSettings() {
    return await this.taxService.getTaxSettings();
  }
}
