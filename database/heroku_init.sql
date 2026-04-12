-- Heroku init/reset schema for JDConnect backend (TypeORM + SnakeNamingStrategy)

-- Drop in dependency-safe order
DROP TABLE IF EXISTS balance_history CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS tax_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS balance_change_type CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS product_category CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  balance DECIMAL(12,2) DEFAULT 0,
  api_key VARCHAR(255),
  api_secret VARCHAR(255),
  ip_whitelist TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_api_key_unique ON users(api_key) WHERE api_key IS NOT NULL;

-- Products
CREATE TYPE product_category AS ENUM ('pulsa', 'data', 'pln', 'game', 'ewallet');

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category product_category NOT NULL,
  provider VARCHAR(100) NOT NULL,
  denomination INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  image_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tax settings
CREATE TABLE tax_settings (
  id SERIAL PRIMARY KEY,
  rate DECIMAL(5,2) NOT NULL DEFAULT 11.00,
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  effective_to TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tax_settings (rate, is_active) VALUES (11.00, true);

-- Transactions
CREATE TYPE transaction_type AS ENUM ('pulsa', 'data', 'pln', 'game', 'ewallet');
CREATE TYPE transaction_status AS ENUM ('pending', 'processing', 'success', 'failed', 'cancelled');

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  provider VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  status transaction_status DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_va_number VARCHAR(100),
  external_id VARCHAR(100),
  metadata JSONB,
  notes TEXT,
  tax_rate DECIMAL(5,2),
  tax_amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- Balance history
CREATE TYPE balance_change_type AS ENUM ('topup', 'transaction', 'refund', 'admin_adjustment');

CREATE TABLE balance_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  balance_before DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  type balance_change_type NOT NULL,
  reference_id VARCHAR(255),
  description VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_balance_history_user_id ON balance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_type ON balance_history(type);

