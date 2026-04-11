import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxService } from './tax.service';
import { TaxController } from './tax.controller';
import { TaxSetting } from './entities/tax.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TaxSetting])],
  controllers: [TaxController],
  providers: [TaxService],
  exports: [TaxService],
})
export class TaxModule {}
// extra comment to trigger rebuild
