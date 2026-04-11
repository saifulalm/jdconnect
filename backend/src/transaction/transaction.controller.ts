import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Product } from '../product/entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
  ) {}

   @Post()
   async create(@Body() createTransactionDto: CreateTransactionDto, @Request() req) {
     // Fetch product details
     const product = await this.productRepository.findOne({ 
       where: { id: createTransactionDto.productId } 
     });
     if (!product) {
       throw new BadRequestException('Product not found');
     }
     if (!product.isActive) {
       throw new BadRequestException('Product is not active');
     }

     const quantity = createTransactionDto.quantity ?? 1;

     // Let service compute tax and totals
     return this.transactionService.create(createTransactionDto, req.user.id);
   }

  @Get()
  findAll(@Request() req) {
    return this.transactionService.findByUserId(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionService.findById(id);
  }

  @Get('invoice/:invoiceNumber')
  findByInvoice(@Param('invoiceNumber') invoiceNumber: string) {
    return this.transactionService.findByInvoiceNumber(invoiceNumber);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.transactionService.updateStatus(id, status as any);
  }
}