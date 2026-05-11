/**
 * Currency Conversion Service
 * 
 * Priority order:
 * 1. Live API (Frankfurter) — always try first
 * 2. Live API fallback (fawazahmed0) — if Frankfurter is down
 * 3. Database (last known rates) — only if both APIs fail
 * 
 * Every 10 minutes, the system fetches fresh rates and persists them to the DB
 * so the fallback stays reasonably current.
 */

import { db } from './database.js';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const SUPPORTED_CURRENCIES = ['USD', 'ILS', 'EUR', 'GBP', 'UGX', 'KES', 'TZS', 'RWF', 'NGN', 'GHS', 'ZAR'];

class CurrencyConverter {
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  /**
   * Initialize: start the background refresh timer.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Fetch and persist rates immediately on startup
    await this.refreshAndPersist();

    // Refresh every 10 minutes
    this.refreshTimer = setInterval(() => {
      this.refreshAndPersist().catch((err) => {
        console.error('Exchange rate refresh failed:', err);
      });
    }, REFRESH_INTERVAL_MS);

    this.initialized = true;
    console.log('Currency converter initialized. Refreshing rates every 10 minutes.');
  }

  stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Get the exchange rate from one currency to another.
   * Tries live APIs first, falls back to DB only if APIs are down.
   */
  async getRate(from: string, to: string): Promise<number> {
    from = from.toUpperCase();
    to = to.toUpperCase();
    if (from === to) return 1;

    // 1. Try live API (direct pair)
    try {
      return await this.fetchFromFrankfurterDirect(from, to);
    } catch {
      // continue to next
    }

    // 2. Try fawazahmed0 fallback
    try {
      return await this.fetchFromExchangeApiDirect(from, to);
    } catch {
      // continue to DB fallback
    }

    // 3. Fall back to database (last persisted rates)
    console.warn(`Live APIs unavailable for ${from}->${to}, using DB fallback`);
    return await this.getRateFromDb(from, to);
  }

  /**
   * Convert an amount from one currency to another.
   */
  async convert(amount: number, from: string, to: string): Promise<{ convertedAmount: number; rate: number }> {
    const rate = await this.getRate(from, to);
    const convertedAmount = Math.round(amount * rate * 100) / 100;
    return { convertedAmount, rate };
  }

  /**
   * Get all rates from DB (for the /rates endpoint).
   */
  async getAllRates(): Promise<{ base: string; rates: Record<string, number>; lastUpdated: Date | null }> {
    try {
      const result = await db.query<{ targetCurrency: string; rate: number; updatedAt: Date }>(
        `SELECT target_currency AS "targetCurrency", rate, updated_at AS "updatedAt"
         FROM exchange_rates WHERE base_currency = 'USD' ORDER BY target_currency`
      );

      const rates: Record<string, number> = {};
      let lastUpdated: Date | null = null;

      for (const row of result.rows) {
        rates[row.targetCurrency] = parseFloat(row.rate as any);
        if (!lastUpdated || new Date(row.updatedAt) > lastUpdated) {
          lastUpdated = new Date(row.updatedAt);
        }
      }

      return { base: 'USD', rates, lastUpdated };
    } catch {
      return { base: 'USD', rates: {}, lastUpdated: null };
    }
  }

  /**
   * Check if a currency is supported.
   */
  isSupported(currency: string): boolean {
    return SUPPORTED_CURRENCIES.includes(currency.toUpperCase());
  }

  // ─── Live API fetchers ─────────────────────────────────────────────────

  private async fetchFromFrankfurterDirect(from: string, to: string): Promise<number> {
    const url = `https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Frankfurter ${response.status}`);
    const data = await response.json() as { rates: Record<string, number> };
    const rate = data.rates?.[to];
    if (!rate) throw new Error(`No rate for ${to}`);
    return rate;
  }

  private async fetchFromExchangeApiDirect(from: string, to: string): Promise<number> {
    const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${from.toLowerCase()}.json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Exchange API ${response.status}`);
    const data = await response.json() as Record<string, any>;
    const rates = data[from.toLowerCase()];
    const rate = rates?.[to.toLowerCase()];
    if (!rate) throw new Error(`No rate for ${to}`);
    return rate;
  }

  // ─── Database fallback ─────────────────────────────────────────────────

  private async getRateFromDb(from: string, to: string): Promise<number> {
    // Rates are stored as USD -> X. Convert via USD.
    const fromRow = await db.queryOne<{ rate: number }>(
      `SELECT rate FROM exchange_rates WHERE base_currency = 'USD' AND target_currency = $1`,
      [from]
    );
    const toRow = await db.queryOne<{ rate: number }>(
      `SELECT rate FROM exchange_rates WHERE base_currency = 'USD' AND target_currency = $1`,
      [to]
    );

    if (!fromRow || !toRow) {
      throw new Error(`Exchange rate not available for ${from} to ${to} (not in DB)`);
    }

    const fromRate = parseFloat(fromRow.rate as any); // USD -> FROM
    const toRate = parseFloat(toRow.rate as any);     // USD -> TO

    // FROM -> TO = (USD->TO) / (USD->FROM)
    return toRate / fromRate;
  }

  // ─── Background refresh (persists to DB) ───────────────────────────────

  private async refreshAndPersist(): Promise<void> {
    let rates: Record<string, number> | null = null;

    // Try Frankfurter
    try {
      const targets = SUPPORTED_CURRENCIES.filter(c => c !== 'USD').join(',');
      const url = `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${targets}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (response.ok) {
        const data = await response.json() as { rates: Record<string, number> };
        rates = data.rates || null;
      }
    } catch {
      // try next
    }

    // Fallback to fawazahmed0
    if (!rates) {
      try {
        const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json`;
        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (response.ok) {
          const data = await response.json() as { usd: Record<string, number> };
          const mapped: Record<string, number> = {};
          for (const c of SUPPORTED_CURRENCIES) {
            const r = data.usd?.[c.toLowerCase()];
            if (r) mapped[c] = r;
          }
          if (Object.keys(mapped).length > 0) rates = mapped;
        }
      } catch {
        // give up
      }
    }

    if (!rates || Object.keys(rates).length === 0) {
      console.warn('Rate refresh: all APIs failed, DB rates unchanged.');
      return;
    }

    // Persist to DB
    rates['USD'] = 1;
    for (const [currency, rate] of Object.entries(rates)) {
      try {
        await db.query(
          `INSERT INTO exchange_rates (base_currency, target_currency, rate, updated_at)
           VALUES ('USD', $1, $2, NOW())
           ON CONFLICT (base_currency, target_currency)
           DO UPDATE SET rate = $2, updated_at = NOW()`,
          [currency, rate]
        );
      } catch (err) {
        console.error(`Failed to persist rate USD->${currency}:`, err);
      }
    }

    console.log(`Exchange rates refreshed and persisted: ${Object.keys(rates).length} currencies`);
  }
}

export const currencyConverter = new CurrencyConverter();
