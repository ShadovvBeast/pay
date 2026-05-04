-- Migration: Add mobile money payment provider support
-- Adds payment_method, payment_provider, and provider_reference columns to transactions
-- Supports MTN MoMo, Airtel Money, M-Pesa, and future mobile money providers

-- Add payment method and provider columns
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) NOT NULL DEFAULT 'card',
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(30) NOT NULL DEFAULT 'allpay',
  ADD COLUMN IF NOT EXISTS provider_reference VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_metadata JSONB;

-- Update existing transactions to reflect they used AllPay/card
UPDATE transactions 
SET payment_method = 'card', payment_provider = 'allpay'
WHERE payment_method = 'card' AND payment_provider = 'allpay';

-- Add constraint for valid payment methods
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS chk_payment_method;
ALTER TABLE transactions
  ADD CONSTRAINT chk_payment_method 
  CHECK (payment_method IN ('card', 'mtn_momo', 'airtel_money', 'mpesa', 'mobile_money'));

-- Add constraint for valid payment providers
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS chk_payment_provider;
ALTER TABLE transactions
  ADD CONSTRAINT chk_payment_provider 
  CHECK (payment_provider IN ('allpay', 'mtn_momo', 'airtel_money', 'mpesa'));

-- Create indexes for provider queries
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_provider ON transactions(payment_provider);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_reference ON transactions(provider_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_phone ON transactions(customer_phone);

-- Add comments
COMMENT ON COLUMN transactions.payment_method IS 'Payment method: card, mtn_momo, airtel_money, mpesa, mobile_money';
COMMENT ON COLUMN transactions.payment_provider IS 'Payment provider: allpay, mtn_momo, airtel_money, mpesa';
COMMENT ON COLUMN transactions.provider_reference IS 'External reference ID from the payment provider';
COMMENT ON COLUMN transactions.provider_metadata IS 'Provider-specific metadata (callback data, status details, etc.)';
