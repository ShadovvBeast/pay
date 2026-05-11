/**
 * Currency Conversion Service
 * 
 * Uses the Frankfurter API (free, no key required) for exchange rates.
 * Falls back to a static rate table if the API is unavailable.
 * 
 * Rates are cached for 1 hour to minimize API calls.
 */

interface CachedRate {
  rate: number;
  fetchedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Fallback rates (approximate, USD-based) — used if API is down
const FALLBACK_RATES_TO_USD: Record<string, number> = {
  USD: 1,
  ILS: 0.27,
  EUR: 1.08,
  GBP: 1.26,
  UGX: 0.000267,  // 1 UGX ≈ 0.000267 USD (1 USD ≈ 3750 UGX)
  KES: 0.0065,    // 1 KES ≈ 0.0065 USD
  TZS: 0.00038,   // 1 TZS ≈ 0.00038 USD
  RWF: 0.00072,   // 1 RWF ≈ 0.00072 USD
  NGN: 0.00063,   // 1 NGN ≈ 0.00063 USD
  GHS: 0.063,     // 1 GHS ≈ 0.063 USD
  ZAR: 0.054,     // 1 ZAR ≈ 0.054 USD
};

class CurrencyConverter {
  private cache: Map<string, CachedRate> = new Map();

  /**
   * Get the exchange rate from one currency to another.
   * Returns how many units of `to` you get for 1 unit of `from`.
   */
  async getRate(from: string, to: string): Promise<number> {
    from = from.toUpperCase();
    to = to.toUpperCase();

    if (from === to) return 1;

    const cacheKey = `${from}_${to}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.rate;
    }

    // Try Frankfurter API
    try {
      const rate = await this.fetchFromFrankfurter(from, to);
      this.cache.set(cacheKey, { rate, fetchedAt: Date.now() });
      return rate;
    } catch (error) {
      console.warn(`Frankfurter API failed for ${from}->${to}:`, error instanceof Error ? error.message : error);
    }

    // Try fawazahmed0 exchange-api as fallback
    try {
      const rate = await this.fetchFromExchangeApi(from, to);
      this.cache.set(cacheKey, { rate, fetchedAt: Date.now() });
      return rate;
    } catch (error) {
      console.warn(`Exchange API fallback failed for ${from}->${to}:`, error instanceof Error ? error.message : error);
    }

    // Use static fallback rates
    const rate = this.getStaticRate(from, to);
    if (rate !== null) {
      console.warn(`Using static fallback rate for ${from}->${to}: ${rate}`);
      return rate;
    }

    throw new Error(`Unable to get exchange rate for ${from} to ${to}`);
  }

  /**
   * Convert an amount from one currency to another.
   */
  async convert(amount: number, from: string, to: string): Promise<{ convertedAmount: number; rate: number }> {
    const rate = await this.getRate(from, to);
    const convertedAmount = Math.round(amount * rate * 100) / 100; // Round to 2 decimal places
    return { convertedAmount, rate };
  }

  private async fetchFromFrankfurter(from: string, to: string): Promise<number> {
    const url = `https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

    if (!response.ok) {
      throw new Error(`Frankfurter API returned ${response.status}`);
    }

    const data = await response.json() as { rates: Record<string, number> };
    const rate = data.rates?.[to];

    if (!rate) {
      throw new Error(`No rate found for ${to} in Frankfurter response`);
    }

    return rate;
  }

  private async fetchFromExchangeApi(from: string, to: string): Promise<number> {
    const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${from.toLowerCase()}.json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

    if (!response.ok) {
      throw new Error(`Exchange API returned ${response.status}`);
    }

    const data = await response.json() as Record<string, any>;
    const rates = data[from.toLowerCase()];
    const rate = rates?.[to.toLowerCase()];

    if (!rate) {
      throw new Error(`No rate found for ${to} in exchange-api response`);
    }

    return rate;
  }

  private getStaticRate(from: string, to: string): number | null {
    const fromToUsd = FALLBACK_RATES_TO_USD[from];
    const toToUsd = FALLBACK_RATES_TO_USD[to];

    if (fromToUsd === undefined || toToUsd === undefined) {
      return null;
    }

    // Convert: from -> USD -> to
    // rate = (1 from in USD) / (1 to in USD)
    return fromToUsd / toToUsd;
  }

  /**
   * Check if a currency is supported.
   */
  isSupported(currency: string): boolean {
    return currency.toUpperCase() in FALLBACK_RATES_TO_USD;
  }
}

export const currencyConverter = new CurrencyConverter();
