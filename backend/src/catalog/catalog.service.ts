import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { OperatorPrefix } from './entities/operator-prefix.entity';

/** Normalise an Indonesian MSISDN to local format (leading 0). */
export function normalizeMsisdn(input: string): string {
  let p = (input || '').replace(/\D/g, '');
  if (p.startsWith('62')) p = '0' + p.slice(2);
  if (!p.startsWith('0') && p.length > 0) p = '0' + p;
  return p;
}

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(OperatorPrefix)
    private readonly prefixRepo: Repository<OperatorPrefix>,
  ) {}

  // --- categories ------------------------------------------------------------
  findActiveCategories(): Promise<Category[]> {
    return this.categoryRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', label: 'ASC' },
    });
  }

  findAllCategories(): Promise<Category[]> {
    return this.categoryRepo.find({ order: { sortOrder: 'ASC', label: 'ASC' } });
  }

  async createCategory(data: Partial<Category>): Promise<Category> {
    if (!data.key || !data.label) throw new BadRequestException('key and label are required');
    const exists = await this.categoryRepo.findOne({ where: { key: data.key } });
    if (exists) throw new BadRequestException(`Category "${data.key}" already exists`);
    return this.categoryRepo.save(this.categoryRepo.create(data));
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    const found = await this.categoryRepo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Category not found');
    await this.categoryRepo.update(id, data);
    return (await this.categoryRepo.findOne({ where: { id } }))!;
  }

  async removeCategory(id: string): Promise<void> {
    await this.categoryRepo.delete(id);
  }

  // --- operator prefixes -----------------------------------------------------
  findPrefixes(): Promise<OperatorPrefix[]> {
    return this.prefixRepo.find({
      where: { isActive: true },
      order: { provider: 'ASC', prefix: 'ASC' },
    });
  }

  async createPrefix(data: Partial<OperatorPrefix>): Promise<OperatorPrefix> {
    const prefix = normalizeMsisdn(data.prefix || '');
    if (!prefix || !data.provider) throw new BadRequestException('prefix and provider are required');
    const exists = await this.prefixRepo.findOne({ where: { prefix } });
    if (exists) throw new BadRequestException(`Prefix "${prefix}" already mapped to ${exists.provider}`);
    return this.prefixRepo.save(this.prefixRepo.create({ ...data, prefix }));
  }

  async updatePrefix(id: string, data: Partial<OperatorPrefix>): Promise<OperatorPrefix> {
    const found = await this.prefixRepo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Prefix not found');
    if (data.prefix) data.prefix = normalizeMsisdn(data.prefix);
    await this.prefixRepo.update(id, data);
    return (await this.prefixRepo.findOne({ where: { id } }))!;
  }

  async removePrefix(id: string): Promise<void> {
    await this.prefixRepo.delete(id);
  }

  /** Longest-prefix match so 4-digit entries win over 3-digit ones. */
  async detectProvider(phone: string): Promise<string | null> {
    const p = normalizeMsisdn(phone);
    if (p.length < 4) return null;
    const all = await this.findPrefixes();
    let best: OperatorPrefix | null = null;
    for (const row of all) {
      if (p.startsWith(row.prefix) && (!best || row.prefix.length > best.prefix.length)) {
        best = row;
      }
    }
    return best?.provider ?? null;
  }
}
