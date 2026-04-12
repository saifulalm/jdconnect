import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
export enum ProductCategory {
  PULSA = 'pulsa',
  DATA = 'data',
  PLN = 'pln',
  GAME = 'game',
  EWALLET = 'ewallet',
}
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  sku: string;

  @Column()
  name: string;

  @Column({
    type: 'simple-enum',
    enum: ProductCategory,
  })
  category: ProductCategory;

  @Column()
  provider: string;

  @Column()
  denomination: number; // amount in rupiah for pulsa, or MB for data, etc.

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ default: 0 })
  stock: number; // optional stock tracking

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
