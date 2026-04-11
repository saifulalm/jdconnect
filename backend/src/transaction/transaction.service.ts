import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Transaction, TransactionStatus, TransactionType } from './entities/transaction.entity';
import { Product } from '../product/entities/product.entity';
import { TaxService } from '../tax/tax.service';
import { UserService } from '../user/user.service';
import { BalanceChangeType } from '../user/entities/balance-history.entity';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private taxService: TaxService,
    private userService: UserService,
    private dataSource: DataSource,
  ) {}

  async create(createTransactionDto: any, userId: string): Promise<Transaction> {
    const invoiceNumber = this.generateInvoiceNumber();

    // Idempotency check (using client_ref if provided in metadata)
    const clientRef = createTransactionDto.metadata?.client_ref;
    if (clientRef) {
      const existing = await this.transactionRepository.findOne({
        where: { metadata: { client_ref: clientRef } as any },
      });
      if (existing) {
        return existing;
      }
    }

    // Fetch product
    const product = await this.productRepository.findOne({
      where: { id: createTransactionDto.productId },
    });
    if (!product) {
      throw new BadRequestException('Product not found');
    }
    const quantity = createTransactionDto.quantity ?? 1;
    // Get active tax rate
    const taxRate = await this.taxService.getActiveTaxRate();
    // Compute amounts
    const baseAmount = product.denomination * quantity; // amount before tax
    const taxAmount = baseAmount * (taxRate / 100);
    const price = baseAmount + taxAmount; // price includes tax

    return await this.dataSource.transaction(async (manager) => {
      // 1. Deduct balance first (atomically)
      try {
        await this.userService.updateBalance(
          userId,
          -price, // Negative amount for deduction
          BalanceChangeType.TRANSACTION,
          invoiceNumber,
          `Transaction for ${product.name} to ${createTransactionDto.phoneNumber}`,
        );
      } catch (error) {
        if (error instanceof BadRequestException && error.message === 'Insufficient balance') {
          throw new BadRequestException('Insufficient balance to perform this transaction');
        }
        throw error;
      }

      // 2. Create transaction record
      const transactionData: Partial<Transaction> = {
        invoiceNumber,
        userId,
        type: (<any>product.category) as TransactionType,
        productId: product.id,
        provider: product.provider,
        phoneNumber: createTransactionDto.phoneNumber,
        amount: baseAmount,
        price: price,
        taxRate,
        taxAmount,
        paymentMethod: createTransactionDto.paymentMethod || 'BALANCE',
        notes: createTransactionDto.notes,
        metadata: createTransactionDto.metadata || {},
        status: TransactionStatus.PROCESSING, // H2H usually goes straight to processing
      };

      const transaction = manager.create(Transaction, transactionData);
      const savedTransaction = await manager.save(transaction);

      // TODO: Here you would typically call the upstream supplier API
      // For now, we'll just simulate success after a delay or keep it processing
      
      return savedTransaction;
    });
  }

  async findByUserId(userId: string): Promise<Transaction[]> {
    return await this.transactionRepository.find({
      where: { userId },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Transaction | null> {
    return await this.transactionRepository.findOne({
      where: { id },
      relations: ['product'],
    });
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Transaction | null> {
    return await this.transactionRepository.findOne({
      where: { invoiceNumber },
      relations: ['product'],
    });
  }

  async updateStatus(id: string, status: TransactionStatus): Promise<Transaction | null> {
    await this.transactionRepository.update(id, { status });
    return this.findById(id);
  }

  async updatePayment(id: string, paymentData: Partial<Transaction>): Promise<Transaction | null> {
    await this.transactionRepository.update(id, paymentData);
    return this.findById(id);
  }

  private generateInvoiceNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `INV${timestamp}${random}`;
  }

  async getTransactionsByType(type: TransactionType): Promise<Transaction[]> {
    return await this.transactionRepository.find({
      where: { type },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async getTransactionsByStatus(status: TransactionStatus): Promise<Transaction[]> {
    return await this.transactionRepository.find({
      where: { status },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }
}
