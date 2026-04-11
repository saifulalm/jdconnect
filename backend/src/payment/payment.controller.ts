import { Controller, Post, Get, Body, Param, Headers } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-va')
  async createBankTransferVa(@Body() createPaymentDto: any) {
    return this.paymentService.createBankTransferVa(createPaymentDto);
  }

  @Get('status/:externalId')
  async checkPaymentStatus(@Param('externalId') externalId: string) {
    return this.paymentService.checkPaymentStatus(externalId);
  }

  @Post('webhook')
  async processWebhook(@Body() webhookData: any, @Headers('x-callback-token') callbackToken: string) {
    return this.paymentService.processWebhook(webhookData);
  }

  // Xendit specific webhook endpoint
  @Post('xendit/callback')
  async xenditCallback(@Body() callbackData: any) {
    console.log('Xendit callback received:', callbackData);
    
    // Process payment status update
    const result = await this.paymentService.processWebhook(callbackData);
    
    return {
      status: 'success',
      data: result,
    };
  }
}
