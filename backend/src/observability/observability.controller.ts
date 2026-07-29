import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ObservabilityService } from './observability.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles/role.enum';

@Controller('observability')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERACCESS)
export class ObservabilityController {
  constructor(private readonly observability: ObservabilityService) {}

  /** Privileged-action trail. */
  @Get('audit')
  audit(@Query('limit') limit?: string) {
    return this.observability.findAuditLogs(limit ? Number(limit) : 100);
  }

  /** Raw supplier interactions, optionally for one order. */
  @Get('supplier-logs')
  supplierLogs(@Query('limit') limit?: string, @Query('refId') refId?: string) {
    return this.observability.findSupplierLogs({
      limit: limit ? Number(limit) : 100,
      refId,
    });
  }

  /** Latency and success/fail/pending rates per supplier. */
  @Get('supplier-performance')
  performance(@Query('hours') hours?: string) {
    return this.observability.supplierPerformance(hours ? Number(hours) : 24);
  }
}
