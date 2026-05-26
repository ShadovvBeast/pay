-- Migration: 012_crypto_wallets
-- Description: Add crypto wallet storage (Polygon-based, AES-256 encrypted private keys)

-- Crypto wallets — one per user, stores encrypted private key
CREATE TABLE IF NOT EXISTS crypto_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  address VARCHAR(42) NOT NULL,  -- Ethereum/Polygon address (0x...)
  encrypted_private_key TEXT NOT NULL,  -- AES-256-GCM encrypted
  network VARCHAR(20) NOT NULL DEFAULT 'polygon',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crypto_wallets_user_id ON crypto_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_address ON crypto_wallets(address);

-- Add MATIC, USDC to supported_assets if not exists
INSERT INTO supported_assets (code, name, symbol, asset_type, network, decimals, is_swappable) VALUES
  ('MATIC_POLYGON', 'Polygon (MATIC)', 'MATIC', 'crypto', 'polygon', 18, TRUE),
  ('USDC_POLYGON', 'USDC (Polygon)', 'USDC', 'crypto', 'polygon', 6, TRUE)
ON CONFLICT (code) DO NOTHING;

-- Update asset_prices with MATIC and USDC
INSERT INTO asset_prices (asset_code, price_usd) VALUES
  ('MATIC_POLYGON', 0.40),
  ('USDC_POLYGON', 1.0)
ON CONFLICT (asset_code) DO UPDATE SET price_usd = EXCLUDED.price_usd, updated_at = NOW();

-- Rollback:
-- DROP TABLE IF EXISTS crypto_wallets;
