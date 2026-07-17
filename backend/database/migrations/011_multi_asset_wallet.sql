-- Migration: 011_multi_asset_wallet
-- Description: Transform single-currency wallet into multi-asset wallet
-- Supports: FIAT_CARD (AllPay), FIAT_MOMO (Mobile Money), USDT, BTC on multiple networks

-- Supported assets registry
CREATE TABLE IF NOT EXISTS supported_assets (
  code VARCHAR(30) PRIMARY KEY,          -- e.g. 'FIAT_CARD', 'USDT_POLYGON', 'BTC_MAINNET'
  name VARCHAR(100) NOT NULL,            -- e.g. 'Card Balance', 'USDT (Polygon)'
  symbol VARCHAR(10) NOT NULL,           -- e.g. '$', '₮', '₿'
  asset_type VARCHAR(10) NOT NULL CHECK (asset_type IN ('fiat', 'crypto')),
  network VARCHAR(30) NOT NULL,          -- e.g. 'allpay', 'mobile_money', 'polygon', 'solana', 'bitcoin', 'plasma'
  decimals INTEGER NOT NULL DEFAULT 2,   -- decimal places for display
  is_swappable BOOLEAN NOT NULL DEFAULT FALSE,  -- can be swapped with other crypto assets
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  icon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed supported assets
INSERT INTO supported_assets (code, name, symbol, asset_type, network, decimals, is_swappable) VALUES
  ('FIAT_CARD', 'Card Balance', '$', 'fiat', 'allpay', 2, FALSE),
  ('FIAT_MOMO', 'Mobile Money Balance', '$', 'fiat', 'mobile_money', 2, FALSE),
  ('USDT_POLYGON', 'USDT (Polygon)', '₮', 'crypto', 'polygon', 6, TRUE),
  ('USDT_SOLANA', 'USDT (Solana)', '₮', 'crypto', 'solana', 6, TRUE),
  ('USDT_PLASMA', 'USDT (Plasma)', '₮', 'crypto', 'plasma', 6, TRUE),
  ('BTC_MAINNET', 'Bitcoin', '₿', 'crypto', 'bitcoin', 8, TRUE),
  ('BTC_LIGHTNING', 'Bitcoin (Lightning)', '₿', 'crypto', 'lightning', 8, TRUE)
ON CONFLICT (code) DO NOTHING;

-- Per-user asset balances (replaces single wallets.balance)
CREATE TABLE IF NOT EXISTS wallet_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  asset_code VARCHAR(30) NOT NULL REFERENCES supported_assets(code),
  balance NUMERIC(18, 8) NOT NULL DEFAULT 0,
  deposit_address VARCHAR(255),  -- crypto deposit address (null for fiat)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(wallet_id, asset_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_balances_wallet_id ON wallet_balances(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_balances_asset ON wallet_balances(asset_code);

-- Add asset_code to wallet_transactions
ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS asset_code VARCHAR(30) DEFAULT 'FIAT_CARD',
  ADD COLUMN IF NOT EXISTS network VARCHAR(30);

-- Migrate existing wallet balances to FIAT_CARD asset
-- For each existing wallet with balance > 0, create a wallet_balances row
INSERT INTO wallet_balances (wallet_id, asset_code, balance)
SELECT id, 'FIAT_CARD', balance
FROM wallets
WHERE balance > 0
ON CONFLICT (wallet_id, asset_code) DO UPDATE SET balance = EXCLUDED.balance;

-- Update existing wallet_transactions to have asset_code = 'FIAT_CARD'
UPDATE wallet_transactions SET asset_code = 'FIAT_CARD' WHERE asset_code IS NULL OR asset_code = 'FIAT_CARD';

-- Add swap type to wallet_transactions
ALTER TABLE wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN ('deposit', 'withdrawal', 'refund_debit', 'adjustment', 'transfer_in', 'transfer_out', 'swap_in', 'swap_out'));

-- Crypto asset prices cache (for portfolio valuation)
CREATE TABLE IF NOT EXISTS asset_prices (
  asset_code VARCHAR(30) PRIMARY KEY REFERENCES supported_assets(code),
  price_usd NUMERIC(18, 8) NOT NULL,  -- price in USD
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial prices
INSERT INTO asset_prices (asset_code, price_usd) VALUES
  ('FIAT_CARD', 1.0),
  ('FIAT_MOMO', 1.0),
  ('USDT_POLYGON', 1.0),
  ('USDT_SOLANA', 1.0),
  ('USDT_PLASMA', 1.0),
  ('BTC_MAINNET', 104000.0),
  ('BTC_LIGHTNING', 104000.0)
ON CONFLICT (asset_code) DO NOTHING;

-- Rollback:
-- DROP TABLE IF EXISTS asset_prices;
-- DROP TABLE IF EXISTS wallet_balances;
-- DROP TABLE IF EXISTS supported_assets;
-- ALTER TABLE wallet_transactions DROP COLUMN IF EXISTS asset_code;
-- ALTER TABLE wallet_transactions DROP COLUMN IF EXISTS network;
