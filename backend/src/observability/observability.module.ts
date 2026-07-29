import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierLog } from './entities/supplier-log.entity';
import { AuditLog } from './entities/audit-log.entity';
import { ObservabilityService } from './observability.service';
import { ObservabilityController } from './observability.controller';

// Global: logging is cross-cutting and needed by supplier, payment, admin and
// transaction modules without threading imports through each of them.
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SupplierLog, AuditLog])],
  controllers: [ObservabilityController],
  providers: [ObservabilityService],
  exports: [ObservabilityService],
})
export class ObservabilityModule {}
