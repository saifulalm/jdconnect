import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { ObservabilityService } from '../observability/observability.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles/role.enum';

@Controller('reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERACCESS)
export class ReconciliationController {
  constructor(
    private readonly reconciliation: ReconciliationService,
    private readonly observability: ObservabilityService,
  ) {}

  /** Run the sweep on demand instead of waiting for the next minute tick. */
  @Post('run')
  async run(@Req() req: any) {
    const result = await this.reconciliation.runNow();
    await this.observability.logAudit({
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      actorRole: req.user?.role,
      action: 'reconciliation.manual_run',
      detail: result,
      ip: req.ip,
    });
    return result;
  }
}
