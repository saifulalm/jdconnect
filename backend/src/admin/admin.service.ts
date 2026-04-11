import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminService {
  async getStats() {
    // Mock stats - replace with actual database queries
    return {
      totalUsers: 1250,
      totalTransactions: 8432,
      totalRevenue: 125000000,
      pendingTransactions: 23,
      successRate: 98.5,
    };
  }

  async getTransactions() {
    // Mock transactions
    return {
      transactions: [
        { id: 1, invoice: 'INV001', user: 'John', amount: 50000, status: 'success' },
        { id: 2, invoice: 'INV002', user: 'Jane', amount: 100000, status: 'pending' },
      ],
      total: 2,
    };
  }

  async getUsers() {
    // Mock users
    return {
      users: [
        { id: 1, name: 'John Doe', email: 'john@example.com', transactions: 15 },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', transactions: 23 },
      ],
      total: 2,
    };
  }

  async getRevenue() {
    // Mock revenue data
    return {
      today: 5000000,
      week: 35000000,
      month: 125000000,
      year: 1500000000,
    };
  }
}
