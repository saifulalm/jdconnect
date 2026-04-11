import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationService {
  private transporter: any;
  private enabled: boolean;

  constructor(private configService: ConfigService) {
    // Configure email transporter
    try {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
        port: this.configService.get('SMTP_PORT', 587),
        secure: false,
        auth: {
          user: this.configService.get('SMTP_USER'),
          pass: this.configService.get('SMTP_PASS'),
        },
      });
      this.enabled = true;
    } catch (error) {
      console.error('Email configuration error:', error);
      this.enabled = false;
    }
  }

  async sendTransactionEmail(
    to: string,
    transactionData: {
      invoiceNumber: string;
      product: string;
      phoneNumber: string;
      amount: number;
      status: string;
    },
  ) {
    if (!this.enabled) {
      console.log('Email not enabled, skipping...');
      return { success: false, message: 'Email service not configured' };
    }

    const mailOptions = {
      from: `"PulsaKu" <${this.configService.get('SMTP_USER')}>`,
      to,
      subject: `Konfirmasi Transaksi #${transactionData.invoiceNumber}`,
      html: this.buildTransactionEmailHtml(transactionData),
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPaymentReminder(
    to: string,
    paymentData: {
      invoiceNumber: string;
      amount: number;
      vaNumber: string;
      bank: string;
    },
  ) {
    if (!this.enabled) {
      return { success: false, message: 'Email service not configured' };
    }

    const mailOptions = {
      from: `"PulsaKu" <${this.configService.get('SMTP_USER')}>`,
      to,
      subject: `Reminder Pembayaran #${paymentData.invoiceNumber}`,
      html: this.buildPaymentReminderHtml(paymentData),
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(to: string, name: string) {
    if (!this.enabled) {
      return { success: false, message: 'Email service not configured' };
    }

    const mailOptions = {
      from: `"PulsaKu" <${this.configService.get('SMTP_USER')}>`,
      to,
      subject: 'Selamat Datang di PulsaKu!',
      html: this.buildWelcomeEmailHtml(name),
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  private buildTransactionEmailHtml(data: any) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">PulsaKu</h1>
        </div>
        <div style="padding: 20px;">
          <h2>Konfirmasi Transaksi</h2>
          <p>Terima kasih telah bertransaksi di PulsaKu!</p>
          
          <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Invoice:</strong> ${data.invoiceNumber}</p>
            <p><strong>Produk:</strong> ${data.product}</p>
            <p><strong>Nomor:</strong> ${data.phoneNumber}</p>
            <p><strong>Total:</strong> Rp ${data.amount.toLocaleString('id-ID')}</p>
            <p><strong>Status:</strong> <span style="color: ${data.status === 'success' ? 'green' : 'orange'}">${data.status}</span></p>
          </div>
          
          <p>Simpan email ini sebagai bukti transaksi yang sah.</p>
          <p>Hubungi kami jika ada pertanyaan.</p>
        </div>
        <div style="background: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>&copy; 2024 PulsaKu. All rights reserved.</p>
        </div>
      </div>
    `;
  }

  private buildPaymentReminderHtml(data: any) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Reminder Pembayaran</h1>
        </div>
        <div style="padding: 20px;">
          <p>Anda memiliki pembayaran yang belum diselesaikan:</p>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Invoice:</strong> ${data.invoiceNumber}</p>
            <p><strong>Amount:</strong> Rp ${data.amount.toLocaleString('id-ID')}</p>
            <p><strong>Bank:</strong> ${data.bank}</p>
            <p><strong>VA Number:</strong> ${data.vaNumber}</p>
          </div>
          
          <p>Silakan segera menyelesaikan pembayaran Anda.</p>
        </div>
      </div>
    `;
  }

  private buildWelcomeEmailHtml(name: string) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #10b981; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Selamat Datang!</h1>
        </div>
        <div style="padding: 20px;">
          <p>Halo ${name},</p>
          <p>Selamat datang di PulsaKu! Platform terpercaya untuk transaksi pulsa all operator.</p>
          <p>Mulai bertransaksi sekarang dan nikmati kemudahan isi pulsa dengan pembayaran bank transfer.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/dashboard" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Mulai Transaksi</a>
          </div>
        </div>
      </div>
    `;
  }
}
