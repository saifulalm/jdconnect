import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { BalanceHistory } from './entities/balance-history.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, BalanceHistory])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}