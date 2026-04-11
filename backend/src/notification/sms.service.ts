import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private enabled: boolean;

  constructor(private configService: ConfigService) {
    // Check if SMS service is configured
    this.enabled = !!(
      this.configService.get('TWILIO_SID') &&
      this.configService.get('TWILIO_TOKEN')
    );
  }

  async sendSms(phoneNumber: string, message: string) {
    if (!this.enabled) {
      console.log('SMS service not configured, skipping...');
      return { success: false, message: 'SMS service not configured' };
    }

    try {
      // Twilio integration example
      // In production, install twilio package and use official SDK
      console.log(`Sending SMS to ${phoneNumber}: ${message}`);
      
      return {
        success: true,
        messageId: `sms_${Date.now()}`,
        message: 'SMS sent successfully',
      };
    } catch (error) {
      console.error('SMS send error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendTransactionSms(
    phoneNumber: string,
    transactionData: {
      invoiceNumber: string;
      product: string;
      amount: number;
      status: string;
    },
  ) {
    const message = `PulsaKu: Transaksi ${transactionData.product} senilai Rp ${transactionData.amount.toLocaleString('id-ID')} ${transactionData.status}. Inv: ${transactionData.invoiceNumber}`;
    return this.sendSms(phoneNumber, message);
  }

  async sendOtpSms(phoneNumber: string, otp: string) {
    const message = `PulsaKu: Kode OTP Anda adalah ${otp}. Jangan berikan kode ini kepada siapapun. Berlaku 5 menit.`;
    return this.sendSms(phoneNumber, message);
  }

  async sendPaymentReminderSms(
    phoneNumber: string,
    invoiceNumber: string,
    amount: number,
  ) {
    const message = `PulsaKu: Reminder pembayaran invoice ${invoiceNumber} sebesar Rp ${amount.toLocaleString('id-ID')}. Segera bayar untuk memproses transaksi.`;
    return this.sendSms(phoneNumber, message);
  }
}
