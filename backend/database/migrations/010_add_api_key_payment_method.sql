-- Migration: 010_add_api_key_payment_method
-- Description: Each API key is bound to a single payment method (card or mobile_money)

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'card'
  CHECK (payment_method IN ('card', 'mobile_money'));

COMMENT ON COLUMN api_keys.payment_method IS 'Payment method this key can process: card (AllPay) or mobile_money (MTN/Airtel/M-Pesa)';

-- Rollback:
-- ALTER TABLE api_keys DROP COLUMN IF EXISTS payment_method;
