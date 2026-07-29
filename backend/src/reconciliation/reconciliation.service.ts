import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  PaymentStatus,
} from '../transaction/entities/transaction.entity';
import { TransactionService } from '../transaction/transaction.service';
import { SupplierService } from '../supplier/supplier.service';
import { PaymentService } from '../payment/payment.service';
import { ObservabilityService } from '../observability/observability.service';

/**
 * Rescues orders that were left mid-flight.
 *
 * The app dispatches top-ups inline during the payment callback, so a crash,
 * a supplier timeout or a dropped webhook used to strand an order forever:
 * nothing ever revisited a PROCESSING or PENDING row. These jobs are the
 * safety net until the work moves onto a proper queue.
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);
  private readonly enabled: boolean;
  private running = false;

  /** How long an order may sit in a non-terminal state before we chase it. */
  private readonly staleAfterMs = 5 * 60 * 1000;
  /** Orders never paid within this window are abandoned. */
  private readonly expireUnpaidAfterMs = 24 * 60 * 60 * 1000;

  constructor(
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    private readonly transactionService: TransactionService,
    private readonly supplierService: SupplierService,
    private readonly paymentService: PaymentService,
    private readonly observability: ObservabilityService,
    config: ConfigService,
  ) {
    // Off in tests; opt-out available for single-purpose workers.
    const env = config.get<string>('NODE_ENV');
    this.enabled = env !== 'test' && config.get<string>('RECONCILIATION_ENABLED', 'true') !== 'false';
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async reconcile(): Promise<void> {
    if (!this.enabled) return;
    // Single-flight: a long supplier poll must not overlap the next tick.
    if (this.running) {
      this.logger.warn('Previous reconciliation run still in progress, skipping tick');
      return;
    }
    this.running = true;
    try {
      await this.settleStuckTopups();
      await this.chasePendingPayments();
      await this.expireAbandonedOrders();
    } catch (err: any) {
      this.logger.error(`Reconciliation failed: ${err.message}`);
    } finally {
      this.running = false;
    }
  }

  /**
   * Paid orders whose top-up never reached a terminal state. Ask the supplier
   * what actually happened rather than guessing.
   */
  private async settleStuckTopups(): Promise<number> {
    const cutoff = new Date(Date.now() - this.staleAfterMs);
    const stuck = await this.transactions.find({
      where: {
        paymentStatus: PaymentStatus.PAID,
        status: TransactionStatus.PROCESSING,
        updatedAt: LessThan(cutoff),
      },
      relations: ['product'],
      take: 50,
    });

    for (const trx of stuck) {
      try {
        if (!trx.supplierRef || !trx.product?.sku) {
          // Paid but never dispatched — send it now.
          await this.transactionService.executeTopup(trx.id);
          continue;
        }
        const result = await this.supplierService.checkStatus({
          sku: trx.product.sku,
          customerNo: trx.metadata?.server_id
            ? `${trx.phoneNumber}${trx.metadata.server_id}`
            : trx.phoneNumber,
          refId: trx.supplierRef,
        });
        if (result.status !== 'pending') {
          await this.transactionService.applySupplierResult(result);
          this.logger.log(`Reconciled ${trx.invoiceNumber} -> ${result.status}`);
        }
      } catch (err: any) {
        this.logger.warn(`Reconcile ${trx.invoiceNumber} failed: ${err.message}`);
      }
    }
    return stuck.length;
  }

  /**
   * Orders still awaiting payment. A dropped gateway webhook otherwise means
   * the customer paid and nothing ever happened.
   */
  private async chasePendingPayments(): Promise<number> {
    if (!this.paymentService.isConfigured()) return 0;

    const cutoff = new Date(Date.now() - this.staleAfterMs);
    const pending = await this.transactions.find({
      where: {
        paymentStatus: PaymentStatus.PENDING,
        status: TransactionStatus.PENDING,
        createdAt: LessThan(cutoff),
      },
      take: 50,
    });

    let settled = 0;
    for (const trx of pending) {
      try {
        const result = await this.paymentService.checkStatus(trx.invoiceNumber);
        if (result && (result.paid || result.failed)) {
          await this.transactionService.handlePaymentResult(result);
          settled++;
          this.logger.log(
            `Payment reconciled ${trx.invoiceNumber} -> ${result.paid ? 'paid' : 'failed'}`,
          );
        }
      } catch (err: any) {
        this.logger.warn(`Payment check ${trx.invoiceNumber} failed: ${err.message}`);
      }
    }
    return settled;
  }

  /** Close out orders that were never paid, so they stop being polled. */
  private async expireAbandonedOrders(): Promise<number> {
    const cutoff = new Date(Date.now() - this.expireUnpaidAfterMs);
    const result = await this.transactions
      .createQueryBuilder()
      .update(Transaction)
      .set({ status: TransactionStatus.CANCELLED, paymentStatus: PaymentStatus.EXPIRED })
      .where('status = :status', { status: TransactionStatus.PENDING })
      .andWhere('payment_status IN (:...unpaid)', {
        unpaid: [PaymentStatus.PENDING, PaymentStatus.UNPAID],
      })
      .andWhere('created_at < :cutoff', { cutoff })
      .execute();

    const affected = result.affected ?? 0;
    if (affected > 0) {
      this.logger.log(`Expired ${affected} unpaid orders older than 24h`);
      await this.observability.logAudit({
        action: 'reconciliation.expire_unpaid',
        targetType: 'transaction',
        detail: { count: affected, olderThanHours: 24 },
      });
    }
    return affected;
  }

  /** Manual trigger for admins — same work, on demand. */
  async runNow(): Promise<{ stuckTopups: number; paymentsSettled: number; expired: number }> {
    const stuckTopups = await this.settleStuckTopups();
    const paymentsSettled = await this.chasePendingPayments();
    const expired = await this.expireAbandonedOrders();
    return { stuckTopups, paymentsSettled, expired };
  }
}
