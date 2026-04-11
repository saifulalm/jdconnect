import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { BalanceHistory, BalanceChangeType } from './entities/balance-history.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(BalanceHistory)
    private balanceHistoryRepository: Repository<BalanceHistory>,
    private dataSource: DataSource,
  ) {}

  async create(createUserDto: Partial<User>): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password!, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword
    });
    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id } });
  }

  async findByApiKey(apiKey: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { apiKey } });
  }

  async findBalanceHistoryByUserId(userId: string): Promise<BalanceHistory[]> {
    return await this.balanceHistoryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async generateApiCredentials(userId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) throw new BadRequestException('User not found');

    user.apiKey = 'pk_' + crypto.randomBytes(16).toString('hex');
    user.apiSecret = 'sk_' + crypto.randomBytes(32).toString('hex');
    return await this.userRepository.save(user);
  }

  async updateBalance(
    userId: string,
    amount: number,
    type: BalanceChangeType,
    referenceId?: string,
    description?: string,
  ): Promise<User> {
    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' }, // Prevents race conditions
      });

      if (!user) throw new BadRequestException('User not found');

      const balanceBefore = Number(user.balance);
      const balanceAfter = balanceBefore + amount;

      if (balanceAfter < 0) {
        throw new BadRequestException('Insufficient balance');
      }

      user.balance = balanceAfter;
      await manager.save(user);

      const history = this.balanceHistoryRepository.create({
        userId,
        amount,
        balanceBefore,
        balanceAfter,
        type,
        referenceId,
        description,
      });
      await manager.save(history);

      return user;
    });
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password);
  }

  async update(id: string, updateUserDto: Partial<User>): Promise<User | null> {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    await this.userRepository.update(id, updateUserDto);
    return this.findById(id);
  }
}