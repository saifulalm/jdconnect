-- Create enum type if not exists
DO $$ BEGIN
    CREATE TYPE balance_change_type AS ENUM ('topup', 'transaction', 'refund', 'admin_adjustment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create balance_history table
CREATE TABLE IF NOT EXISTS balance_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    balanceBefore DECIMAL(12,2) NOT NULL,
    balanceAfter DECIMAL(12,2) NOT NULL,
    type balance_change_type NOT NULL,
    referenceId VARCHAR(255),
    description VARCHAR(255),
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_balance_history_userId ON balance_history("userId");
CREATE INDEX IF NOT EXISTS idx_balance_history_type ON balance_history(type);
