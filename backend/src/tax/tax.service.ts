import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxSetting } from './entities/tax.entity';

@Injectable()
export class TaxService {
  constructor(
    @InjectRepository(TaxSetting)
    private taxRepo: Repository<TaxSetting>,
  ) {}

  // Get the active tax rate (the one with is_active=true and effective_from <= now and (effective_to is null or effective_to >= now))
  async getActiveTaxRate(): Promise<number> {
    const now = new Date();
    const tax = await this.taxRepo
      .createQueryBuilder('tax')
      .where('tax.isActive = :isActive', { isActive: true })
      .andWhere('tax.effectiveFrom <= :now', { now })
      .andWhere('(tax.effectiveTo IS NULL OR tax.effectiveTo >= :now)')
      .getOne();
    if (tax) {
      // Postgres returns DECIMAL as string — normalise so callers always get a number.
      return Number(tax.rate);
    }
    // fallback: get any tax ordered by effectiveFrom desc
    const taxSettings = await this.taxRepo.find({
      order: { effectiveFrom: 'DESC' },
      take: 1
    });
    return taxSettings.length > 0 ? taxSettings[0].rate : 11.0; // default fallback
  }

  // For admin: update tax rate (deactivate previous active, insert new)
  async setTaxRate(rate: number): Promise<TaxSetting> {
    // Deactivate current active
    await this.taxRepo.update({ isActive: true }, { isActive: false });
    const newTax = this.taxRepo.create({
      rate,
      effectiveFrom: new Date(),
      isActive: true,
    });
    return this.taxRepo.save(newTax);
  }

  // Get current tax settings (for admin)
  async getTaxSettings(): Promise<TaxSetting[]> {
    return this.taxRepo.find({ order: { effectiveFrom: 'DESC' } });
  }
}
