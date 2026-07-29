import {
  Injectable,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as crypto from 'crypto';

/** Postgres unique_violation (23505); SQLite reports it as a constraint error. */
function isUniqueViolation(err: any): boolean {
  return err?.code === '23505' || /UNIQUE|duplicate key|constraint/i.test(err?.message ?? '');
}
import {
  Transaction,
  TransactionStatus,
  TransactionType,
  TransactionChannel,
  PaymentStatus,
  RefundStatus,
} from './entities/transaction.entity';
import { Product } from '../product/entities/product.entity';
import { TaxService } from '../tax/tax.service';
import { UserService } from '../user/user.service';
import { BalanceChangeType } from '../user/entities/balance-history.entity';
import { SupplierService } from '../supplier/supplier.service';
import { PaymentService } from '../payment/payment.service';
import { NotificationService } from '../notification/notification.service';
import { SmsService } from '../notification/sms.service';
import { SupplierTopupResult } from '../supplier/adapters/supplier-adapter.interface';
import { ObservabilityService } from '../observability/observability.service';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private taxService: TaxService,
    private userService: UserService,
    private dataSource: DataSource,
    @Inject(forwardRef(() => SupplierService))
    private supplierService: SupplierService,
    @Inject(forwardRef(() => PaymentService))
    private paymentService: PaymentService,
    private notificationService: NotificationService,
    private smsService: SmsService,
    private observability: ObservabilityService,
  ) {}

  // ---------------------------------------------------------------------------
  // BALANCE FLOW (logged-in user pays from wallet)
  // ---------------------------------------------------------------------------
  async create(createTransactionDto: any, userId: string): Promise<Transaction> {
    const invoiceNumber = this.generateInvoiceNumber();

    // Idempotency: a caller retrying after a timeout must not be charged
    // twice. Looks at the indexed clientRef column — querying inside the json
    // metadata blob threw at the database and produced duplicate orders.
    const clientRef: string | undefined = createTransactionDto.metadata?.client_ref;
    if (clientRef) {
      const existing = await this.transactionRepository.findOne({
        where: { clientRef },
        relations: ['product'],
      });
      if (existing) return existing;
    }

    const product = await this.productRepository.findOne({
      where: { id: createTransactionDto.productId },
    });
    if (!product) throw new BadRequestException('Product not found');
    if (!product.isActive) throw new BadRequestException('Product is not active');

    const quantity = createTransactionDto.quantity ?? 1;
    const taxRate = await this.taxService.getActiveTaxRate();
    const baseAmount = Number(product.denomination) * quantity;
    const taxAmount = baseAmount * (taxRate / 100);
    const price = Number(product.price) * quantity; // selling price already set per product

    let saved: Transaction;
    try {
      saved = await this.dataSource.transaction(async (manager) => {
      await this.userService.updateBalance(
        userId,
        -price,
        BalanceChangeType.TRANSACTION,
        invoiceNumber,
        `Transaction for ${product.name} to ${createTransactionDto.phoneNumber}`,
      );

      const transaction = manager.create(Transaction, {
        invoiceNumber,
        clientRef,
        userId,
        channel: TransactionChannel.BALANCE,
        type: product.category as unknown as TransactionType,
        productId: product.id,
        provider: product.provider,
        phoneNumber: createTransactionDto.phoneNumber,
        amount: baseAmount,
        price,
        taxRate,
        taxAmount,
        paymentMethod: 'BALANCE',
        paymentStatus: PaymentStatus.PAID,
        paidAt: new Date(),
        notes: createTransactionDto.notes,
        metadata: createTransactionDto.metadata || {},
        status: TransactionStatus.PENDING,
      } as Partial<Transaction>);
      return manager.save(transaction);
      });
    } catch (err: any) {
      // Two concurrent retries can both pass the clientRef lookup above; the
      // unique index then rejects the loser. Return the winner instead of
      // failing the caller — that is what idempotency promises.
      if (clientRef && isUniqueViolation(err)) {
        const existing = await this.transactionRepository.findOne({
          where: { clientRef },
          relations: ['product'],
        });
        if (existing) return existing;
      }
      throw err;
    }

    // Balance already settled -> execute the top-up immediately.
    return this.executeTopup(saved.id);
  }

  // ---------------------------------------------------------------------------
  // GATEWAY / GUEST FLOW (loginless — pay via Midtrans, no wallet)
  // ---------------------------------------------------------------------------
  async createGuestOrder(dto: {
    productId: string;
    phoneNumber: string;
    serverId?: string;
    customerEmail?: string;
    customerName?: string;
    userId?: string;
  }): Promise<{
    transaction: Transaction;
    payment: { token?: string; redirectUrl?: string; qrString?: string; gateway: string };
  }> {
    const product = await this.productRepository.findOne({ where: { id: dto.productId } });
    if (!product) throw new BadRequestException('Product not found');
    if (!product.isActive) throw new BadRequestException('Product is not active');

    const invoiceNumber = this.generateInvoiceNumber();
    const taxRate = await this.taxService.getActiveTaxRate();
    const baseAmount = Number(product.denomination);
    const taxAmount = baseAmount * (taxRate / 100);
    const price = Number(product.price);

    let transaction = this.transactionRepository.create({
      invoiceNumber,
      userId: dto.userId,
      channel: TransactionChannel.GATEWAY,
      type: product.category as unknown as TransactionType,
      productId: product.id,
      provider: product.provider,
      phoneNumber: dto.phoneNumber,
      customerEmail: dto.customerEmail,
      customerName: dto.customerName,
      amount: baseAmount,
      price,
      taxRate,
      taxAmount,
      paymentStatus: PaymentStatus.PENDING,
      status: TransactionStatus.PENDING,
      metadata: dto.serverId ? { server_id: dto.serverId } : {},
    } as Partial<Transaction>);
    transaction = await this.transactionRepository.save(transaction);

    const charge = await this.paymentService.createCharge({
      orderId: invoiceNumber,
      amount: price,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.phoneNumber,
      itemName: product.name,
    });

    await this.transactionRepository.update(transaction.id, {
      paymentMethod: charge.gateway,
      // For the qris driver the payload doubles as the "token" so the track
      // endpoint can re-serve the QR while the order is unpaid.
      paymentToken: charge.token ?? charge.qrString,
      paymentRedirectUrl: charge.redirectUrl,
    });

    return {
      transaction: (await this.findById(transaction.id))!,
      payment: {
        token: charge.token,
        redirectUrl: charge.redirectUrl,
        qrString: charge.qrString,
        gateway: charge.gateway,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // PAYMENT WEBHOOK -> mark paid -> execute top-up
  // ---------------------------------------------------------------------------
  async handlePaymentResult(result: {
    orderId: string;
    paid: boolean;
    failed: boolean;
    pending: boolean;
    paymentMethod?: string;
  }): Promise<void> {
    const trx = await this.findByInvoiceNumber(result.orderId);
    if (!trx) {
      this.logger.warn(`Payment webhook for unknown order ${result.orderId}`);
      return;
    }
    if (trx.paymentStatus === PaymentStatus.PAID) return; // idempotent

    if (result.failed) {
      await this.transactionRepository.update(trx.id, {
        paymentStatus: PaymentStatus.FAILED,
        status: TransactionStatus.FAILED,
      });
      return;
    }
    if (!result.paid) {
      await this.transactionRepository.update(trx.id, { paymentStatus: PaymentStatus.PENDING });
      return;
    }

    await this.transactionRepository.update(trx.id, {
      paymentStatus: PaymentStatus.PAID,
      paidAt: new Date(),
      paymentMethod: result.paymentMethod || trx.paymentMethod,
    });
    await this.executeTopup(trx.id);
  }

  // ---------------------------------------------------------------------------
  // SUPPLIER EXECUTION
  // ---------------------------------------------------------------------------
  async executeTopup(transactionId: string): Promise<Transaction> {
    const trx = await this.findById(transactionId);
    if (!trx) throw new BadRequestException('Transaction not found');
    if (trx.paymentStatus !== PaymentStatus.PAID) {
      this.logger.warn(`Skip top-up for unpaid order ${trx.invoiceNumber}`);
      return trx;
    }
    if (trx.status === TransactionStatus.SUCCESS) return trx; // idempotent

    const sku = trx.product?.sku;
    if (!sku) {
      await this.transactionRepository.update(trx.id, {
        status: TransactionStatus.FAILED,
        supplierMessage: 'Missing product SKU',
      });
      return (await this.findById(trx.id))!;
    }

    const refId = trx.supplierRef || `${trx.invoiceNumber}`;
    await this.transactionRepository.update(trx.id, {
      status: TransactionStatus.PROCESSING,
      supplierDriver: this.supplierService.driverName,
      supplierRef: refId,
      topupAttempts: (trx.topupAttempts ?? 0) + 1,
    });

    let result: SupplierTopupResult;
    try {
      result = await this.supplierService.topUp({
        sku,
        // Game top-ups are addressed as "<userId><serverId>" upstream.
        customerNo: trx.metadata?.server_id
          ? `${trx.phoneNumber}${trx.metadata.server_id}`
          : trx.phoneNumber,
        refId,
      });
    } catch (err: any) {
      this.logger.error(`Supplier top-up error for ${trx.invoiceNumber}: ${err.message}`);
      // Leave as PROCESSING; a callback or status poll can still settle it.
      await this.transactionRepository.update(trx.id, {
        supplierMessage: `Supplier error: ${err.message}`,
      });
      return (await this.findById(trx.id))!;
    }

    return this.settle(trx.id, result);
  }

  /** Apply a supplier callback identified by ref id. */
  async applySupplierResult(result: SupplierTopupResult): Promise<void> {
    const trx = await this.transactionRepository.findOne({
      where: { supplierRef: result.refId },
      relations: ['product'],
    });
    if (!trx) {
      this.logger.warn(`Supplier callback for unknown ref ${result.refId}`);
      return;
    }
    await this.settle(trx.id, result);
  }

  /** Map a supplier result onto the transaction + handle refunds. */
  private async settle(transactionId: string, result: SupplierTopupResult): Promise<Transaction> {
    const trx = await this.findById(transactionId);
    if (!trx) throw new BadRequestException('Transaction not found');

    if (result.status === 'success') {
      await this.transactionRepository.update(trx.id, {
        status: TransactionStatus.SUCCESS,
        serialNumber: result.serial,
        supplierMessage: result.message,
      });
      this.notify(trx, 'success');
    } else if (result.status === 'failed') {
      await this.transactionRepository.update(trx.id, {
        status: TransactionStatus.FAILED,
        supplierMessage: result.message || 'Top-up failed',
      });
      await this.refundIfNeeded(trx);
      this.notify(trx, 'failed');
    } else {
      await this.transactionRepository.update(trx.id, {
        status: TransactionStatus.PROCESSING,
        supplierMessage: result.message,
      });
    }
    return (await this.findById(trx.id))!;
  }

  /** Refund: wallet credit for balance orders, mark refunded for gateway orders. */
  private async refundIfNeeded(trx: Transaction): Promise<void> {
    if (trx.channel === TransactionChannel.BALANCE && trx.userId) {
      try {
        await this.userService.updateBalance(
          trx.userId,
          Number(trx.price),
          BalanceChangeType.REFUND,
          trx.invoiceNumber,
          `Refund for failed top-up ${trx.invoiceNumber}`,
        );
        await this.transactionRepository.update(trx.id, {
          paymentStatus: PaymentStatus.REFUNDED,
          refundStatus: RefundStatus.DONE,
          refundedAt: new Date(),
          refundNote: 'Saldo dikembalikan otomatis',
        });
      } catch (err: any) {
        this.logger.error(`Refund failed for ${trx.invoiceNumber}: ${err.message}`);
      }
    } else {
      // Gateway order. No refund API call is made here, so claiming REFUNDED
      // would be a lie: the customer's money is still with the gateway. Mark
      // it as owed and queue it for an operator, loudly.
      await this.transactionRepository.update(trx.id, {
        paymentStatus: PaymentStatus.PAID,
        refundStatus: RefundStatus.PENDING,
        supplierMessage: trx.supplierMessage
          ? `${trx.supplierMessage} — refund pelanggan menunggu diproses`
          : 'Top-up gagal, refund pelanggan menunggu diproses',
      });
      this.logger.error(
        `REFUND OWED: ${trx.invoiceNumber} (${trx.price}) — top-up failed after payment was taken`,
      );
      await this.observability.logAudit({
        action: 'refund.owed',
        targetType: 'transaction',
        targetId: trx.invoiceNumber,
        detail: {
          amount: Number(trx.price),
          gateway: trx.paymentMethod,
          phone: trx.phoneNumber,
        },
        success: false,
      });
    }
  }

  /** Fire-and-forget receipts: email when given, WhatsApp/SMS to the buyer. */
  private notify(trx: Transaction, status: string): void {
    const email = trx.customerEmail;
    if (email) {
      this.notificationService
        .sendTransactionEmail(email, {
          invoiceNumber: trx.invoiceNumber,
          product: trx.product?.name || trx.provider,
          phoneNumber: trx.phoneNumber,
          amount: Number(trx.price),
          status,
        })
        .catch(() => undefined);
    }

    // Only message real MSISDNs — game/PLN customer ids are not phone numbers.
    const isPhone = /^0?8\d{7,13}$/.test(trx.phoneNumber.replace(/^62/, '0'));
    if (isPhone) {
      this.smsService
        .sendTransactionSms(trx.phoneNumber, {
          invoiceNumber: trx.invoiceNumber,
          product: trx.product?.name || trx.provider,
          amount: Number(trx.price),
          status: status === 'success' ? 'berhasil' : 'gagal',
          serialNumber: trx.serialNumber,
        })
        .catch(() => undefined);
    }
  }

  // ---------------------------------------------------------------------------
  // QUERIES
  // ---------------------------------------------------------------------------
  async findByUserId(userId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { userId },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.transactionRepository.findOne({ where: { id }, relations: ['product'] });
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Transaction | null> {
    return this.transactionRepository.findOne({
      where: { invoiceNumber },
      relations: ['product'],
    });
  }

  /**
   * Attach every unclaimed guest order placed with this number to a user.
   * Ownership of the number is proven upstream with an OTP.
   */
  async claimGuestOrders(userId: string, phoneNumber: string): Promise<number> {
    const digits = phoneNumber.replace(/\D/g, '');
    const local = digits.startsWith('62') ? '0' + digits.slice(2) : digits;
    const intl = local.startsWith('0') ? '62' + local.slice(1) : digits;

    const result = await this.transactionRepository
      .createQueryBuilder()
      .update(Transaction)
      .set({ userId })
      .where('userId IS NULL')
      .andWhere('phoneNumber IN (:...numbers)', { numbers: [local, intl] })
      .execute();

    return result.affected ?? 0;
  }

  /**
   * Record that an owed refund was actually paid back to the customer.
   * Only a human can confirm this, so it is an explicit admin action.
   */
  async markRefundSettled(id: string, note?: string): Promise<Transaction> {
    const trx = await this.findById(id);
    if (!trx) throw new BadRequestException('Transaction not found');
    if (trx.refundStatus !== RefundStatus.PENDING) {
      throw new BadRequestException('Tidak ada refund tertunggak pada transaksi ini');
    }
    await this.transactionRepository.update(id, {
      refundStatus: RefundStatus.DONE,
      paymentStatus: PaymentStatus.REFUNDED,
      refundedAt: new Date(),
      refundNote: note?.trim() || 'Refund dikonfirmasi manual oleh admin',
    });
    return (await this.findById(id))!;
  }

  /** Orders where the customer paid but the top-up failed and money is owed. */
  findRefundsOwed(): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { refundStatus: RefundStatus.PENDING },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Public guest tracking: invoice + last 4 digits of phone must match. */
  async trackGuestOrder(invoiceNumber: string, phoneLast4: string): Promise<Transaction> {
    const trx = await this.findByInvoiceNumber(invoiceNumber);
    if (!trx || !trx.phoneNumber.endsWith(phoneLast4)) {
      throw new BadRequestException('Order not found');
    }
    return trx;
  }

  async updateStatus(id: string, status: TransactionStatus): Promise<Transaction | null> {
    await this.transactionRepository.update(id, { status });
    return this.findById(id);
  }

  async updatePayment(id: string, paymentData: Partial<Transaction>): Promise<Transaction | null> {
    await this.transactionRepository.update(id, paymentData);
    return this.findById(id);
  }

  /**
   * Invoice ids are now unique-constrained in the database, so weak entropy
   * turns a silent duplicate into a failed order. Timestamp + 1000 values of
   * Math.random collides roughly once per thousand same-millisecond pairs;
   * 5 crypto-random bytes makes that vanishingly unlikely.
   */
  private generateInvoiceNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(5).toString('hex').toUpperCase();
    return `INV${timestamp}${random}`;
  }

  async getTransactionsByType(type: TransactionType): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { type },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async getTransactionsByStatus(status: TransactionStatus): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { status },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllRecent(limit = 100): Promise<Transaction[]> {
    return this.transactionRepository.find({
      relations: ['product'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
