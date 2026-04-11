-- PulsaKu Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'user',
    isActive BOOLEAN DEFAULT true,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TYPE product_category AS ENUM ('pulsa', 'data', 'pln', 'game', 'ewallet');
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category product_category NOT NULL,
    provider VARCHAR(100) NOT NULL,
    denomination INTEGER NOT NULL, -- amount in rupiah for pulsa, or MB for data, etc.
    price DECIMAL(10,2) NOT NULL,
    stock INTEGER DEFAULT 0, -- optional stock tracking
    isActive BOOLEAN DEFAULT true,
    description TEXT,
    imageUrl VARCHAR(500),
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tax settings table (single row for simplicity)
CREATE TABLE tax_settings (
    id SERIAL PRIMARY KEY,
    rate DECIMAL(5,2) NOT NULL DEFAULT 11.00,
    effectiveFrom TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    effectiveTo TIMESTAMP WITH TIME ZONE,
    isActive BOOLEAN DEFAULT true,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default tax rate (11%)
INSERT INTO tax_settings (rate, isActive) VALUES (11.00, true);

-- Transactions table
CREATE TYPE transaction_type AS ENUM ('pulsa', 'data', 'pln', 'game', 'ewallet');
CREATE TYPE transaction_status AS ENUM ('pending', 'processing', 'success', 'failed', 'cancelled');

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoiceNumber VARCHAR(50) UNIQUE NOT NULL,
    userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    provider VARCHAR(100) NOT NULL,
    phoneNumber VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    status transaction_status DEFAULT 'pending',
    paymentMethod VARCHAR(50),
    paymentVaNumber VARCHAR(100),
    externalId VARCHAR(100),
    metadata JSONB,
    notes TEXT,
    taxRate DECIMAL(5,2), -- tax rate applied at time of transaction (percent)
    taxAmount DECIMAL(10,2), -- tax amount included in price
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_transactions_userId ON transactions("userId");
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_invoice ON transactions(invoiceNumber);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_provider ON products(provider);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_tax_settings_active ON tax_settings(isActive) WHERE isActive = true;

-- Create trigger for updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updatedAt BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updatedAt BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updatedAt BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123)
-- Note: This is hashed password, in production use proper password hashing
INSERT INTO users (email, password, name, role) VALUES 
('admin@pulsaku.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Admin', 'admin');

-- Insert sample products
INSERT INTO products (sku, name, category, provider, denomination, price, stock, isActive, description) VALUES
('TELKOMSEL_10K', 'Telkomsel 10K', 'pulsa', 'Telkomsel', 10000, 11500, 100, true, 'Pulsa Telkomsel 10.000'),
('TELKOMSEL_25K', 'Telkomsel 25K', 'pulsa', 'Telkomsel', 25000, 26000, 100, true, 'Pulsa Telkomsel 25.000'),
('TELKOMSEL_50K', 'Telkomsel 50K', 'pulsa', 'Telkomsel', 50000, 51000, 100, true, 'Pulsa Telkomsel 50.000'),
('TELKOMSEL_100K', 'Telkomsel 100K', 'pulsa', 'Telkomsel', 100000, 101000, 100, true, 'Pulsa Telkomsel 100.000'),
('INDOSAT_10K', 'Indosat 10K', 'pulsa', 'Indosat', 10000, 11000, 100, true, 'Pulsa Indosat 10.000'),
('INDOSAT_25K', 'Indosat 25K', 'pulsa', 'Indosat', 25000, 25500, 100, true, 'Pulsa Indosat 25.000'),
('XL_10K', 'XL 10K', 'pulsa', 'XL', 10000, 11000, 100, true, 'Pulsa XL 10.000'),
('XL_25K', 'XL 25K', 'pulsa', 'XL', 25000, 25500, 100, true, 'Pulsa XL 25.000'),
('DATA_TSEL_1GB', 'Telkomsel 1GB', 'data', 'Telkomsel', 1024, 15000, 100, true, 'Data Telkomsel 1 GB'),
('DATA_TSEL_3GB', 'Telkomsel 3GB', 'data', 'Telkomsel', 3072, 35000, 100, true, 'Data Telkomsel 3 GB'),
('DATA_INDOSAT_2GB', 'Indosat 2GB', 'data', 'Indosat', 2048, 20000, 100, true, 'Data Indosat 2 GB'),
('DATA_XL_3GB', 'XL 3GB', 'data', 'XL', 3072, 30000, 100, true, 'Data XL 3 GB'),
('PLN_20K', 'Token PLN 20.000', 'pln', 'PLN', 20000, 20500, 100, true, 'Token Listrik PLN 20.000'),
('PLN_50K', 'Token PLN 50.000', 'pln', 'PLN', 50000, 50500, 100, true, 'Token Listrik PLN 50.000'),
('PLN_100K', 'Token PLN 100.000', 'pln', 'PLN', 100000, 100500, 100, true, 'Token Listrik PLN 100.000'),
('GAME_MLBB_86', 'Mobile Legends 86 Diamond', 'game', 'MLBB', 86, 20000, 100, true, 'MLBB 86 Diamond'),
('GAME_FF_140', 'Free Fire 140 Diamond', 'game', 'Free Fire', 140, 20000, 100, true, 'Free Fire 140 Diamond'),
('GAME_PUBG_60UC', 'PUBG 60 UC', 'game', 'PUBG', 60, 15000, 100, true, 'PUBG 60 UC'),
('EWALLET_GOPAY_50K', 'GoPay 50.000', 'ewallet', 'GoPay', 50000, 51000, 100, true, 'GoPay Balance 50.000'),
('EWALLET_OVO_50K', 'OVO 50.000', 'ewallet', 'OVO', 50000, 51000, 100, true, 'OVO Balance 50.000'),
('EWALLET_DANA_50K', 'Dana 50.000', 'ewallet', 'Dana', 50000, 51000, 100, true, 'Dana Balance 50.000');