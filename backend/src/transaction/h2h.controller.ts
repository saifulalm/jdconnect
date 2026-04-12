import { Controller, Post, Get, Body, UseGuards, Req, Param, Query } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { ProductService } from '../product/product.service';
import { Throttle } from '@nestjs/throttler';

@Controller('h2h')
@UseGuards(ApiKeyGuard)
export class H2hController {
  constructor(
    private transactionService: TransactionService,
    private productService: ProductService,
  ) {}

  @Get('balance')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getBalance(@Req() req) {
    const user = req.user;
    return {
      status: 'success',
      data: {
        balance: user.balance,
        currency: 'IDR',
      },
    };
  }

  @Get('products')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async getProducts(@Query('category') category?: string) {
    const products = category 
      ? await this.productService.findByCategory(category)
      : await this.productService.findAll();
    
    return {
      status: 'success',
      data: products.map(p => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        provider: p.provider,
        denomination: p.denomination,
        price: p.price,
        isActive: p.isActive,
      })),
    };
  }

  @Post('transaction')
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async createTransaction(@Body() body: any, @Req() req) {
    const transaction = await this.transactionService.create(body, req.user.id);
    return {
      status: 'success',
      data: {
        invoiceNumber: transaction.invoiceNumber,
        status: transaction.status,
        phoneNumber: transaction.phoneNumber,
        price: transaction.price,
        productName: transaction.product?.name,
        createdAt: transaction.createdAt,
      },
    };
  }

  @Get('transaction/:invoiceNumber')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getTransactionStatus(@Param('invoiceNumber') invoiceNumber: string) {
    const transaction = await this.transactionService.findByInvoiceNumber(invoiceNumber);
    if (!transaction) {
      return {
        status: 'error',
        message: 'Transaction not found',
      };
    }
    return {
      status: 'success',
      data: {
        invoiceNumber: transaction.invoiceNumber,
        status: transaction.status,
        phoneNumber: transaction.phoneNumber,
        price: transaction.price,
        notes: transaction.notes,
        updatedAt: transaction.updatedAt,
      },
    };
  }
}
