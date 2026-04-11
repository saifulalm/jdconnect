import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SmsService } from './sms.service';

@Module({
  providers: [NotificationService, SmsService],
  exports: [NotificationService, SmsService],
})
export class NotificationModule {}
