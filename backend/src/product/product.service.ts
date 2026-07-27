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

  /**
   * Paginated + filtered listing for the admin table. Returns inactive
   * products too so admins can see and re-enable them.
   */
  async findPaginated(params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    provider?: string;
  }): Promise<{ data: Product[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));

    const qb = this.productRepository.createQueryBuilder('p');
    if (params.category) qb.andWhere('p.category = :category', { category: params.category });
    if (params.provider) qb.andWhere('p.provider = :provider', { provider: params.provider });
    if (params.search) {
      qb.andWhere('(p.name ILIKE :q OR p.sku ILIKE :q OR p.provider ILIKE :q)', {
        q: `%${params.search}%`,
      });
    }

    const [data, total] = await qb
      .orderBy('p.provider', 'ASC')
      .addOrderBy('p.price', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  /** Distinct provider list — powers admin filters. */
  async findProviders(): Promise<string[]> {
    const rows = await this.productRepository
      .createQueryBuilder('p')
      .select('DISTINCT p.provider', 'provider')
      .orderBy('provider', 'ASC')
      .getRawMany<{ provider: string }>();
    return rows.map((r) => r.provider);
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
