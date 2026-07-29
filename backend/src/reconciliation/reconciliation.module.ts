import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transaction/entities/transaction.entity';
import { TransactionModule } from '../transaction/transaction.module';
import { SupplierModule } from '../supplier/supplier.module';
import { PaymentModule } from '../payment/payment.module';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationController } from './reconciliation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    TransactionModule,
    SupplierModule,
    PaymentModule,
  ],
  controllers: [ReconciliationController],
  providers: [ReconciliationService],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
