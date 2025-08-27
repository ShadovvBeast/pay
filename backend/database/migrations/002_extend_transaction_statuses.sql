-- Migration: 002_extend_transaction_statuses
-- Description: Allow refunded and partially_refunded transaction statuses
-- Created: 2025-08-27

BEGIN;

-- Drop existing CHECK constraint if it exists, then recreate with extended set
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_status_check
  CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'));

COMMIT;
