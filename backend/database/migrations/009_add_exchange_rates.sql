-- Migration: 009_add_exchange_rates
-- Description: Store exchange rates in the database, updated every 10 minutes

CREATE TABLE IF NOT EXISTS exchange_rates (
  id SERIAL PRIMARY KEY,
  base_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  target_currency VARCHAR(3) NOT NULL,
  rate NUMERIC(18, 10) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(base_currency, target_currency)
);

-- Seed with initial rates (approximate, will be overwritten by live data)
INSERT INTO exchange_rates (base_currency, target_currency, rate) VALUES
  ('USD', 'USD', 1.0),
  ('USD', 'ILS', 3.70),
  ('USD', 'EUR', 0.92),
  ('USD', 'GBP', 0.79),
  ('USD', 'UGX', 3750.0),
  ('USD', 'KES', 154.0),
  ('USD', 'TZS', 2650.0),
  ('USD', 'RWF', 1390.0),
  ('USD', 'NGN', 1580.0),
  ('USD', 'GHS', 15.80),
  ('USD', 'ZAR', 18.50)
ON CONFLICT (base_currency, target_currency) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair ON exchange_rates(base_currency, target_currency);

-- Rollback:
-- DROP TABLE IF EXISTS exchange_rates;
