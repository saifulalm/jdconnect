import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Product, ProductCategory } from './entities/product.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  create(createProductDto: Partial<Product>): Promise<Product> {
    const product = this.productRepository.create(createProductDto);
    return this.productRepository.save(product);
  }

  findAll(): Promise<Product[]> {
    return this.productRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  findOne(id: string): Promise<Product | null> {
    return this.productRepository.findOne({ where: { id } });
  }

  update(id: string, updateProductDto: Partial<Product>): Promise<Product | null> {
    if (updateProductDto.price) {
      updateProductDto.price = Number(updateProductDto.price);
    }
    if (updateProductDto.denomination) {
      updateProductDto.denomination = Number(updateProductDto.denomination);
    }
    if (updateProductDto.stock) {
      updateProductDto.stock = Number(updateProductDto.stock);
    }
    this.productRepository.update(id, updateProductDto);
    return this.findOne(id);
  }

  remove(id: string): Promise<void> {
    return this.productRepository.delete(id).then(() => {});
  }

  // Additional helper methods
  findByCategory(category: string): Promise<Product[]> {
    return this.productRepository.find({
      where: { category: category as ProductCategory, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  findByProvider(provider: string): Promise<Product[]> {
    return this.productRepository.find({
      where: { provider: provider as string, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  searchProducts(searchTerm: string): Promise<Product[]> {
    return this.productRepository.find({
      where: [
        { name: ILike(`%${searchTerm}%`), isActive: true },
        { provider: ILike(`%${searchTerm}%`), isActive: true },
        { sku: ILike(`%${searchTerm}%`), isActive: true },
      ],
      order: { createdAt: 'DESC' },
    });
  }
}
