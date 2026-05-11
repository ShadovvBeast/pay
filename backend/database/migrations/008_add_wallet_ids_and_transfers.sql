-- Migration: 008_add_wallet_ids_and_transfers
-- Description: Add public wallet_id for wallet-to-wallet transfers

-- Add wallet_id column (20-character alphanumeric string)
ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS wallet_id VARCHAR(20) UNIQUE;

-- Generate wallet IDs for existing wallets that don't have one
-- Uses a random 20-character alphanumeric string
DO $$
DECLARE
  r RECORD;
  new_id VARCHAR(20);
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i INT;
BEGIN
  FOR r IN SELECT id FROM wallets WHERE wallet_id IS NULL LOOP
    LOOP
      new_id := '';
      FOR i IN 1..20 LOOP
        new_id := new_id || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      -- Ensure uniqueness
      EXIT WHEN NOT EXISTS (SELECT 1 FROM wallets WHERE wallet_id = new_id);
    END LOOP;
    UPDATE wallets SET wallet_id = new_id WHERE id = r.id;
  END LOOP;
END $$;

-- Make wallet_id NOT NULL after backfilling
ALTER TABLE wallets ALTER COLUMN wallet_id SET NOT NULL;

-- Add transfer type to wallet_transactions
ALTER TABLE wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN ('deposit', 'withdrawal', 'refund_debit', 'adjustment', 'transfer_in', 'transfer_out'));

-- Index for wallet_id lookups
CREATE INDEX IF NOT EXISTS idx_wallets_wallet_id ON wallets(wallet_id);

-- Rollback:
-- ALTER TABLE wallets DROP COLUMN IF EXISTS wallet_id;
-- ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
-- ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check CHECK (type IN ('deposit', 'withdrawal', 'refund_debit', 'adjustment'));
