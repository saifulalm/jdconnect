import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { DigiflazzAdapter } from './adapters/digiflazz.adapter';
import { IakAdapter } from './adapters/iak.adapter';
import { VipResellerAdapter } from './adapters/vip-reseller.adapter';
import { MockAdapter } from './adapters/mock.adapter';
import { Product } from '../product/entities/product.entity';
import { TransactionModule } from '../transaction/transaction.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), forwardRef(() => TransactionModule)],
  controllers: [SupplierController],
  providers: [SupplierService, DigiflazzAdapter, IakAdapter, VipResellerAdapter, MockAdapter],
  exports: [SupplierService],
})
export class SupplierModule {}
