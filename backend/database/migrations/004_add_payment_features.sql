-- Migration: Add enhanced payment features
-- Adds support for line items, installments, expiration, and other AllPay features

-- Add new columns to transactions table
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS line_items JSONB,
  ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS customer_id_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS max_installments INTEGER CHECK (max_installments >= 1 AND max_installments <= 12),
  ADD COLUMN IF NOT EXISTS fixed_installments BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS preauthorize BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS custom_field_1 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS custom_field_2 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS success_url TEXT,
  ADD COLUMN IF NOT EXISTS cancel_url TEXT,
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS api_key_id UUID;

-- Create indexes for new searchable fields
CREATE INDEX IF NOT EXISTS idx_transactions_customer_email ON transactions(customer_email);
CREATE INDEX IF NOT EXISTS idx_transactions_expires_at ON transactions(expires_at);
CREATE INDEX IF NOT EXISTS idx_transactions_api_key_id ON transactions(api_key_id);

-- Add comment to line_items column
COMMENT ON COLUMN transactions.line_items IS 'JSON array of line items: [{"name": "Item", "price": 10.00, "quantity": 1, "includesVat": true}]';
