import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentService {
  private environment: string;

  constructor(private configService: ConfigService) {
    this.environment = this.configService.get<string>('NODE_ENV') || 'development';
  }

  async createBankTransferVa(transactionData: {
    externalId: string;
    amount: number;
    paymentMethod?: string;
    name?: string;
  }) {
    // For now, use mock for all environments
    // In production, integrate with actual Xendit API
    return this.createMockVa(transactionData);
  }

  async checkPaymentStatus(externalId: string) {
    // Mock for development
    return {
      status: 'PENDING',
      paidAmount: 0,
      paymentMethod: 'BANK_TRANSFER',
    };
  }

  async processWebhook(notificationData: any) {
    try {
      // Verify webhook signature
      const isValid = this.verifyWebhookSignature(notificationData);
      
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      return {
        success: true,
        transactionId: notificationData.external_id,
        status: notificationData.status === 'PAID' ? 'SUCCESS' : 'FAILED',
        amount: notificationData.amount,
      };
    } catch (error) {
      console.error('Webhook processing error:', error);
      throw error;
    }
  }

  private mapToBankCode(paymentMethod: string): string {
    const bankMap: Record<string, string> = {
      'BCA': 'BCA',
      'BNI': 'BNI',
      'BRI': 'BRI',
      'MANDIRI': 'MANDIRI',
      'PERMATA': 'PERMATA',
    };
    return bankMap[paymentMethod?.toUpperCase()] || 'BCA';
  }

  private calculateExpiration(): Date {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 24);
    return expiration;
  }

  private verifyWebhookSignature(data: any): boolean {
    // Implement webhook signature verification
    // This should verify Xendit webhook signature
    return true;
  }

  private createMockVa(transactionData: any) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    
    return {
      success: true,
      data: {
        externalId: transactionData.externalId,
        amount: transactionData.amount,
        bankCode: this.mapToBankCode(transactionData.paymentMethod || 'BCA'),
        vaNumber: `88608${timestamp}${random}`,
        name: transactionData.name || 'Customer',
        expirationDate: this.calculateExpiration(),
      },
      message: 'Virtual account created (mock mode)',
    };
  }
}
