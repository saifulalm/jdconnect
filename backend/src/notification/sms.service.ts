import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithTimeout } from '../common/http.util';

export type MessagingDriver = 'whatsapp' | 'twilio' | 'none';

/**
 * Outbound messaging (OTP, transaction updates).
 *
 * Drivers, picked automatically from the environment:
 *  - whatsapp: token-based WA gateway (Fonnte-compatible: POST target+message
 *    with an Authorization token). Preferred in Indonesia — cheaper and
 *    higher delivery rates than SMS.
 *  - twilio: classic SMS.
 *  - none: log only, so local development still shows the OTP.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly driver: MessagingDriver;
  private readonly waToken: string;
  private readonly waUrl: string;
  private readonly twilioSid: string;
  private readonly twilioToken: string;
  private readonly twilioFrom: string;

  constructor(private configService: ConfigService) {
    this.waToken = this.configService.get<string>('WHATSAPP_TOKEN', '');
    this.waUrl = this.configService.get<string>(
      'WHATSAPP_API_URL',
      'https://api.fonnte.com/send',
    );
    this.twilioSid = this.configService.get<string>('TWILIO_SID', '');
    this.twilioToken = this.configService.get<string>('TWILIO_TOKEN', '');
    this.twilioFrom = this.configService.get<string>('TWILIO_FROM', '');

    if (this.waToken) this.driver = 'whatsapp';
    else if (this.twilioSid && this.twilioToken) this.driver = 'twilio';
    else this.driver = 'none';

    this.logger.log(`Messaging driver: ${this.driver}`);
  }

  get activeDriver(): MessagingDriver {
    return this.driver;
  }

  /** WhatsApp gateways expect E.164 without "+" (62xxx). */
  private toIntl(phone: string): string {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.startsWith('62')) return digits;
    if (digits.startsWith('0')) return '62' + digits.slice(1);
    return digits;
  }

  async sendSms(phoneNumber: string, message: string) {
    const target = this.toIntl(phoneNumber);

    if (this.driver === 'none') {
      this.logger.log(`[dev] message to ${target}: ${message}`);
      return { success: false, message: 'Messaging service not configured' };
    }

    try {
      if (this.driver === 'whatsapp') {
        const res = await fetchWithTimeout(this.waUrl, {
          method: 'POST',
          headers: {
            Authorization: this.waToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ target, message }),
        });
        const json: any = await res.json().catch(() => ({}));
        if (!res.ok || json?.status === false) {
          throw new Error(json?.reason || `WhatsApp gateway HTTP ${res.status}`);
        }
        return { success: true, messageId: json?.id?.[0] ?? `wa_${Date.now()}`, driver: 'whatsapp' };
      }

      // Twilio REST API — no SDK needed.
      const auth = Buffer.from(`${this.twilioSid}:${this.twilioToken}`).toString('base64');
      const body = new URLSearchParams({
        To: `+${target}`,
        From: this.twilioFrom,
        Body: message,
      });
      const res = await fetchWithTimeout(
        `https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
        },
      );
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || `Twilio HTTP ${res.status}`);
      return { success: true, messageId: json?.sid, driver: 'twilio' };
    } catch (error: any) {
      this.logger.error(`Message send failed to ${target}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async sendTransactionSms(
    phoneNumber: string,
    transactionData: {
      invoiceNumber: string;
      product: string;
      amount: number;
      status: string;
      serialNumber?: string;
    },
  ) {
    const lines = [
      `*JDConnect* — transaksi ${transactionData.status}`,
      `Produk: ${transactionData.product}`,
      `Total: Rp ${transactionData.amount.toLocaleString('id-ID')}`,
      `Invoice: ${transactionData.invoiceNumber}`,
    ];
    if (transactionData.serialNumber) lines.push(`SN/Token: ${transactionData.serialNumber}`);
    return this.sendSms(phoneNumber, lines.join('\n'));
  }

  async sendOtpSms(phoneNumber: string, otp: string) {
    const message = `Kode OTP JDConnect kamu: *${otp}*\nBerlaku 5 menit. Jangan berikan kode ini kepada siapa pun.`;
    return this.sendSms(phoneNumber, message);
  }

  async sendPaymentReminderSms(phoneNumber: string, invoiceNumber: string, amount: number) {
    const message = `JDConnect: pembayaran invoice ${invoiceNumber} sebesar Rp ${amount.toLocaleString('id-ID')} belum diterima. Segera selesaikan agar pesanan diproses.`;
    return this.sendSms(phoneNumber, message);
  }
}
