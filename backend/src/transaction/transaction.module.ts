import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { OrdersController } from './orders.controller';
import { H2hController } from './h2h.controller';
import { Product } from '../product/entities/product.entity';
import { TaxModule } from '../tax/tax.module';
import { ProductModule } from '../product/product.module';
import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';
import { SupplierModule } from '../supplier/supplier.module';
import { PaymentModule } from '../payment/payment.module';
import { OtpModule } from '../otp/otp.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Product]),
    TaxModule,
    ProductModule,
    UserModule,
    NotificationModule,
    OtpModule,
    AuthModule,
    forwardRef(() => SupplierModule),
    forwardRef(() => PaymentModule),
  ],
  controllers: [TransactionController, OrdersController, H2hController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
