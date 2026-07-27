import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { makeDynamicQris } from './qris.util';

export interface CreateChargeParams {
  orderId: string; // our invoice number
  amount: number; // gross amount (IDR, integer)
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  itemName?: string;
}

export interface ChargeResult {
  orderId: string;
  token?: string; // Snap token
  redirectUrl?: string;
  qrString?: string; // dynamic QRIS payload (qris-static driver)
  gateway: string;
}

export interface WebhookResult {
  orderId: string;
  paid: boolean;
  failed: boolean;
  pending: boolean;
  rawStatus: string;
  paymentMethod?: string;
  grossAmount?: number;
}

/**
 * Midtrans Snap integration with an automatic mock fallback when
 * MIDTRANS_SERVER_KEY is absent — keeps the checkout flow runnable in dev.
 * Signature: sha512(order_id + status_code + gross_amount + ServerKey).
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly serverKey: string;
  private readonly clientKey: string;
  private readonly isProduction: boolean;
  private readonly qrisStaticCode: string;

  constructor(private readonly config: ConfigService) {
    this.serverKey = this.config.get<string>('MIDTRANS_SERVER_KEY', '');
    this.clientKey = this.config.get<string>('MIDTRANS_CLIENT_KEY', '');
    this.isProduction = this.config.get<string>('MIDTRANS_IS_PRODUCTION', 'false') === 'true';
    this.qrisStaticCode = this.config.get<string>('QRIS_STATIC_CODE', '');
  }

  // Priority: real gateway > open-source static-QRIS > mock.
  get gatewayName(): string {
    if (this.isConfigured()) return 'midtrans';
    if (this.qrisStaticCode) return 'qris';
    return 'mock';
  }

  get clientKeyPublic(): string {
    return this.clientKey;
  }

  isConfigured(): boolean {
    return Boolean(this.serverKey);
  }

  private get snapBase(): string {
    return this.isProduction
      ? 'https://app.midtrans.com/snap/v1'
      : 'https://app.sandbox.midtrans.com/snap/v1';
  }

  private get apiBase(): string {
    return this.isProduction
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2';
  }

  private authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.serverKey}:`).toString('base64');
  }

  async createCharge(params: CreateChargeParams): Promise<ChargeResult> {
    const amount = Math.round(params.amount);
    if (!this.isConfigured()) {
      // Open-source path: dynamic QRIS generated from the merchant's static
      // code. Payment is confirmed manually (admin) — no PJP auto-detection.
      if (this.qrisStaticCode) {
        return {
          orderId: params.orderId,
          qrString: makeDynamicQris(this.qrisStaticCode, amount),
          gateway: 'qris',
        };
      }
      // Mock: pretend a Snap session was created.
      const frontend = this.config
        .get('FRONTEND_URL', 'http://localhost:4001')
        .split(',')[0];
      return {
        orderId: params.orderId,
        token: `mock-${params.orderId}`,
        redirectUrl: `${frontend}/track/${params.orderId}?mock=1`,
        gateway: 'mock',
      };
    }

    const body = {
      transaction_details: { order_id: params.orderId, gross_amount: amount },
      item_details: [
        {
          id: params.itemName || 'topup',
          price: amount,
          quantity: 1,
          name: (params.itemName || 'Top Up').slice(0, 50),
        },
      ],
      customer_details: {
        first_name: params.customerName || 'Pelanggan',
        email: params.customerEmail || undefined,
        phone: params.customerPhone || undefined,
      },
      credit_card: { secure: true },
    };

    const res = await fetch(`${this.snapBase}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: this.authHeader(),
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as any;
    if (!res.ok) {
      this.logger.error(`Midtrans charge failed: ${JSON.stringify(json)}`);
      throw new Error(json?.error_messages?.join(', ') || 'Midtrans charge failed');
    }
    return {
      orderId: params.orderId,
      token: json.token,
      redirectUrl: json.redirect_url,
      gateway: 'midtrans',
    };
  }

  /** Verify + interpret a Midtrans HTTP notification payload. */
  verifyAndParseWebhook(payload: any): WebhookResult | null {
    if (!this.isConfigured()) {
      // Mock mode: trust payload (used by the local mock-pay endpoint).
      return this.interpret(payload);
    }
    const expected = crypto
      .createHash('sha512')
      .update(
        `${payload.order_id}${payload.status_code}${payload.gross_amount}${this.serverKey}`,
      )
      .digest('hex');
    if (expected !== payload.signature_key) {
      this.logger.warn(`Midtrans webhook signature mismatch for ${payload.order_id}`);
      return null;
    }
    return this.interpret(payload);
  }

  /** Poll Midtrans for the authoritative status of an order. */
  async checkStatus(orderId: string): Promise<WebhookResult | null> {
    if (!this.isConfigured()) return null;
    const res = await fetch(`${this.apiBase}/${orderId}/status`, {
      headers: { Accept: 'application/json', Authorization: this.authHeader() },
    });
    const json = (await res.json()) as any;
    if (!res.ok) return null;
    return this.interpret(json);
  }

  private interpret(payload: any): WebhookResult {
    const status = (payload.transaction_status || '').toLowerCase();
    const fraud = (payload.fraud_status || '').toLowerCase();
    const paid =
      (status === 'capture' && (fraud === 'accept' || fraud === '')) || status === 'settlement';
    const failed = ['deny', 'cancel', 'expire', 'failure'].includes(status);
    const pending = status === 'pending' || (status === 'capture' && fraud === 'challenge');
    return {
      orderId: payload.order_id,
      paid,
      failed,
      pending,
      rawStatus: status,
      paymentMethod: payload.payment_type,
      grossAmount: payload.gross_amount ? Number(payload.gross_amount) : undefined,
    };
  }
}
