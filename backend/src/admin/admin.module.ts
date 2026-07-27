import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserModule } from '../user/user.module';
import { Transaction } from '../transaction/entities/transaction.entity';
import { User } from '../user/entities/user.entity';
import { TransactionModule } from '../transaction/transaction.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, User]),
    UserModule,
    forwardRef(() => TransactionModule),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
