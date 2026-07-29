import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Transaction, TransactionStatus } from '../transaction/entities/transaction.entity';
import { User } from '../user/entities/user.entity';

/** Start of day/week/month/year in local time. */
function startOf(unit: 'day' | 'week' | 'month' | 'year', ref = new Date()): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  if (unit === 'week') {
    // Monday as first day of week.
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
  } else if (unit === 'month') {
    d.setDate(1);
  } else if (unit === 'year') {
    d.setMonth(0, 1);
  }
  return d;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private async sumRevenueSince(since: Date): Promise<number> {
    const row = await this.transactionRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.price), 0)', 'sum')
      .where('t.status = :status', { status: TransactionStatus.SUCCESS })
      .andWhere('t.createdAt >= :since', { since })
      .getRawOne<{ sum: string }>();
    return Number(row?.sum ?? 0);
  }

  async getStats() {
    const [totalUsers, totalTransactions, successCount, pendingTransactions] = await Promise.all([
      this.userRepo.count(),
      this.transactionRepo.count(),
      this.transactionRepo.count({ where: { status: TransactionStatus.SUCCESS } }),
      this.transactionRepo.count({ where: { status: TransactionStatus.PENDING } }),
    ]);

    const totalRevenue = await this.sumRevenueSince(new Date(0));

    return {
      totalUsers,
      totalTransactions,
      totalRevenue,
      pendingTransactions,
      successRate: totalTransactions
        ? Math.round((successCount / totalTransactions) * 1000) / 10
        : 0,
    };
  }

  async getTransactions(limit = 100) {
    const [rows, total] = await this.transactionRepo.findAndCount({
      relations: ['product'],
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 500),
    });

    return {
      transactions: rows.map((t) => ({
        id: t.id,
        invoice: t.invoiceNumber,
        invoiceNumber: t.invoiceNumber,
        user: t.customerName || t.customerEmail || (t.userId ? 'Akun terdaftar' : 'Tamu'),
        product: t.product?.name ?? t.provider,
        phoneNumber: t.phoneNumber,
        amount: Number(t.price),
        status: t.status,
        paymentStatus: t.paymentStatus,
        paymentMethod: t.paymentMethod,
        refundStatus: t.refundStatus,
        refundNote: t.refundNote,
        serialNumber: t.serialNumber,
        message: t.supplierMessage,
        createdAt: t.createdAt,
      })),
      total,
    };
  }

  async getUsers() {
    const users = await this.userRepo.find({ order: { createdAt: 'DESC' } });

    // Transaction counts per user in one grouped query.
    const counts = await this.transactionRepo
      .createQueryBuilder('t')
      .select('t.userId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('t.userId IS NOT NULL')
      .groupBy('t.userId')
      .getRawMany<{ userId: string; count: string }>();
    const countMap = new Map(counts.map((c) => [c.userId, Number(c.count)]));

    return {
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        balance: Number(u.balance),
        isActive: u.isActive,
        transactions: countMap.get(u.id) ?? 0,
        createdAt: u.createdAt,
      })),
      total: users.length,
    };
  }

  async getRevenue() {
    const [today, week, month, year] = await Promise.all([
      this.sumRevenueSince(startOf('day')),
      this.sumRevenueSince(startOf('week')),
      this.sumRevenueSince(startOf('month')),
      this.sumRevenueSince(startOf('year')),
    ]);

    // Last 6 months, oldest first — powers the reports chart.
    const series: Array<{ month: string; revenue: number; count: number }> = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const rows = await this.transactionRepo.find({
        where: { status: TransactionStatus.SUCCESS, createdAt: Between(from, to) },
        select: ['price'],
      });
      series.push({
        // Local YYYY-MM — toISOString() would shift into the previous month
        // for positive UTC offsets (e.g. WIB).
        month: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`,
        revenue: rows.reduce((s, r) => s + Number(r.price), 0),
        count: rows.length,
      });
    }

    return { today, week, month, year, series };
  }
}
