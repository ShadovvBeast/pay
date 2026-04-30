/**
 * Phone Number → Payment Provider Router
 * 
 * Routes payment requests to the correct mobile money provider based on
 * the customer's phone number prefix. Covers MTN MoMo, Airtel Money,
 * and M-Pesa across all supported countries.
 */

import type { PhonePrefixEntry, PaymentProvider, PaymentMethod, ProviderRouteResult } from '../types/mobileMoney.js';

// ─── Global Phone Prefix Database ────────────────────────────────────────────
// Format: countryCode (without +), country ISO, prefixes after country code,
//         provider, default currency, active

const PHONE_PREFIX_DB: PhonePrefixEntry[] = [
  // ── MTN MoMo ────────────────────────────────────────────────────────────
  // Uganda (+256)
  { countryCode: '256', country: 'UG', prefixes: ['77', '78', '76'], provider: 'mtn_momo', currency: 'UGX', active: true },
  // Ghana (+233)
  { countryCode: '233', country: 'GH', prefixes: ['24', '25', '53', '54', '55', '59'], provider: 'mtn_momo', currency: 'GHS', active: true },
  // Cameroon (+237)
  { countryCode: '237', country: 'CM', prefixes: ['67', '68', '650', '651', '652', '653', '654'], provider: 'mtn_momo', currency: 'XAF', active: true },
  // Ivory Coast / Côte d'Ivoire (+225)
  { countryCode: '225', country: 'CI', prefixes: ['05', '06', '44', '45', '46', '54', '55', '56', '64', '65', '66', '74', '75', '76'], provider: 'mtn_momo', currency: 'XOF', active: true },
  // Rwanda (+250)
  { countryCode: '250', country: 'RW', prefixes: ['78', '79'], provider: 'mtn_momo', currency: 'RWF', active: true },
  // Benin (+229)
  { countryCode: '229', country: 'BJ', prefixes: ['66', '67', '69', '96', '97', '99'], provider: 'mtn_momo', currency: 'XOF', active: true },
  // Congo-Brazzaville (+242)
  { countryCode: '242', country: 'CG', prefixes: ['05', '06'], provider: 'mtn_momo', currency: 'XAF', active: true },
  // Guinea-Conakry (+224)
  { countryCode: '224', country: 'GN', prefixes: ['62', '66', '67', '68'], provider: 'mtn_momo', currency: 'GNF', active: true },
  // Zambia (+260) — MTN
  { countryCode: '260', country: 'ZM', prefixes: ['96', '76'], provider: 'mtn_momo', currency: 'ZMW', active: true },
  // South Africa (+27) — MTN
  { countryCode: '27', country: 'ZA', prefixes: ['60', '61', '71', '81', '83'], provider: 'mtn_momo', currency: 'ZAR', active: true },
  // Nigeria (+234) — MTN
  { countryCode: '234', country: 'NG', prefixes: ['703', '706', '803', '806', '810', '813', '814', '816', '903', '906', '913', '916'], provider: 'mtn_momo', currency: 'NGN', active: true },
  // Liberia (+231)
  { countryCode: '231', country: 'LR', prefixes: ['88', '77'], provider: 'mtn_momo', currency: 'LRD', active: true },
  // South Sudan (+211)
  { countryCode: '211', country: 'SS', prefixes: ['92', '91'], provider: 'mtn_momo', currency: 'SSP', active: true },
  // Eswatini (+268)
  { countryCode: '268', country: 'SZ', prefixes: ['76', '78'], provider: 'mtn_momo', currency: 'SZL', active: true },
  // Afghanistan (+93) — MTN
  { countryCode: '93', country: 'AF', prefixes: ['66', '68'], provider: 'mtn_momo', currency: 'AFN', active: true },

  // ── Airtel Money ────────────────────────────────────────────────────────
  // Uganda (+256)
  { countryCode: '256', country: 'UG', prefixes: ['70', '75', '74'], provider: 'airtel_money', currency: 'UGX', active: true },
  // Kenya (+254)
  { countryCode: '254', country: 'KE', prefixes: ['73', '78', '100', '101', '102', '103', '104', '105'], provider: 'airtel_money', currency: 'KES', active: true },
  // Tanzania (+255)
  { countryCode: '255', country: 'TZ', prefixes: ['68', '69', '78'], provider: 'airtel_money', currency: 'TZS', active: true },
  // Malawi (+265)
  { countryCode: '265', country: 'MW', prefixes: ['99', '98', '88'], provider: 'airtel_money', currency: 'MWK', active: true },
  // Zambia (+260)
  { countryCode: '260', country: 'ZM', prefixes: ['97', '77'], provider: 'airtel_money', currency: 'ZMW', active: true },
  // Chad (+235)
  { countryCode: '235', country: 'TD', prefixes: ['66', '77'], provider: 'airtel_money', currency: 'XAF', active: true },
  // DRC (+243)
  { countryCode: '243', country: 'CD', prefixes: ['99', '97'], provider: 'airtel_money', currency: 'CDF', active: true },
  // Gabon (+241)
  { countryCode: '241', country: 'GA', prefixes: ['74', '77'], provider: 'airtel_money', currency: 'XAF', active: true },
  // Madagascar (+261)
  { countryCode: '261', country: 'MG', prefixes: ['33', '34'], provider: 'airtel_money', currency: 'MGA', active: true },
  // Niger (+227)
  { countryCode: '227', country: 'NE', prefixes: ['70', '73', '74'], provider: 'airtel_money', currency: 'XOF', active: true },
  // Nigeria (+234) — Airtel
  { countryCode: '234', country: 'NG', prefixes: ['701', '708', '802', '808', '812', '901', '902', '904', '907', '912'], provider: 'airtel_money', currency: 'NGN', active: true },
  // Seychelles (+248)
  { countryCode: '248', country: 'SC', prefixes: ['25', '26'], provider: 'airtel_money', currency: 'SCR', active: true },
  // India (+91) — Airtel
  { countryCode: '91', country: 'IN', prefixes: ['98', '99', '80', '70'], provider: 'airtel_money', currency: 'INR', active: true },
  // Sri Lanka (+94) — Airtel
  { countryCode: '94', country: 'LK', prefixes: ['75'], provider: 'airtel_money', currency: 'LKR', active: true },

  // ── M-Pesa (Safaricom / Vodacom) ───────────────────────────────────────
  // Kenya (+254) — Safaricom
  { countryCode: '254', country: 'KE', prefixes: ['70', '71', '72', '74', '79', '110', '111', '112', '113', '114', '115'], provider: 'mpesa', currency: 'KES', active: true },
  // Tanzania (+255) — Vodacom
  { countryCode: '255', country: 'TZ', prefixes: ['74', '75', '76'], provider: 'mpesa', currency: 'TZS', active: true },
  // DRC (+243) — Vodacom
  { countryCode: '243', country: 'CD', prefixes: ['81', '82', '83', '84', '85'], provider: 'mpesa', currency: 'CDF', active: true },
  // Mozambique (+258) — Vodacom
  { countryCode: '258', country: 'MZ', prefixes: ['84', '85', '86', '87'], provider: 'mpesa', currency: 'MZN', active: true },
  // Egypt (+20) — Vodafone
  { countryCode: '20', country: 'EG', prefixes: ['10', '11', '12'], provider: 'mpesa', currency: 'EGP', active: true },
  // Ghana (+233) — Vodafone
  { countryCode: '233', country: 'GH', prefixes: ['20', '50'], provider: 'mpesa', currency: 'GHS', active: true },
  // Lesotho (+266)
  { countryCode: '266', country: 'LS', prefixes: ['56', '57', '58', '59'], provider: 'mpesa', currency: 'LSL', active: true },
  // Ethiopia (+251)
  { countryCode: '251', country: 'ET', prefixes: ['91', '94', '47'], provider: 'mpesa', currency: 'ETB', active: true },
];

// ─── Build Lookup Trie for Fast Matching ─────────────────────────────────────

interface TrieNode {
  children: Map<string, TrieNode>;
  entry?: PhonePrefixEntry;
}

function buildTrie(entries: PhonePrefixEntry[]): TrieNode {
  const root: TrieNode = { children: new Map() };

  for (const entry of entries) {
    if (!entry.active) continue;

    for (const prefix of entry.prefixes) {
      const fullPrefix = entry.countryCode + prefix;
      let node = root;

      for (const digit of fullPrefix) {
        if (!node.children.has(digit)) {
          node.children.set(digit, { children: new Map() });
        }
        node = node.children.get(digit)!;
      }

      // Longest match wins — later entries for same prefix overwrite
      node.entry = entry;
    }
  }

  return root;
}

const prefixTrie = buildTrie(PHONE_PREFIX_DB);

// ─── Phone Number Normalization ──────────────────────────────────────────────

/**
 * Normalize a phone number to E.164 format (digits only, no +).
 * Handles various input formats:
 *   +256771234567 → 256771234567
 *   0771234567 (with country hint) → 256771234567
 *   00256771234567 → 256771234567
 */
export function normalizePhoneNumber(phone: string, defaultCountryCode?: string): string {
  // Strip all non-digit characters
  let digits = phone.replace(/\D/g, '');

  // Remove leading 00 (international dialing prefix)
  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }

  // If starts with 0, it's a local number — prepend country code
  if (digits.startsWith('0') && defaultCountryCode) {
    digits = defaultCountryCode + digits.substring(1);
  }

  return digits;
}

// ─── Provider Routing ────────────────────────────────────────────────────────

/**
 * Route a phone number to the appropriate mobile money provider.
 * Uses longest-prefix matching against the global phone prefix database.
 * 
 * @param phone - Phone number (any format, will be normalized)
 * @param defaultCountryCode - Default country code if phone starts with 0
 * @returns Routing result or null if no provider found
 */
export function routeToProvider(phone: string, defaultCountryCode?: string): ProviderRouteResult | null {
  const normalized = normalizePhoneNumber(phone, defaultCountryCode);

  if (normalized.length < 7) {
    return null; // Too short to be a valid phone number
  }

  // Walk the trie for longest prefix match
  let node = prefixTrie;
  let lastMatch: PhonePrefixEntry | undefined;

  for (const digit of normalized) {
    if (!node.children.has(digit)) break;
    node = node.children.get(digit)!;
    if (node.entry) {
      lastMatch = node.entry;
    }
  }

  if (!lastMatch) {
    return null;
  }

  return {
    provider: lastMatch.provider,
    paymentMethod: lastMatch.provider as PaymentMethod,
    country: lastMatch.country,
    currency: lastMatch.currency,
    normalizedPhone: '+' + normalized,
  };
}

/**
 * Get all supported countries and their providers.
 */
export function getSupportedCountries(): Array<{
  country: string;
  countryCode: string;
  providers: PaymentProvider[];
  currencies: string[];
}> {
  const countryMap = new Map<string, {
    country: string;
    countryCode: string;
    providers: Set<PaymentProvider>;
    currencies: Set<string>;
  }>();

  for (const entry of PHONE_PREFIX_DB) {
    if (!entry.active) continue;

    const existing = countryMap.get(entry.country);
    if (existing) {
      existing.providers.add(entry.provider);
      existing.currencies.add(entry.currency);
    } else {
      countryMap.set(entry.country, {
        country: entry.country,
        countryCode: entry.countryCode,
        providers: new Set([entry.provider]),
        currencies: new Set([entry.currency]),
      });
    }
  }

  return Array.from(countryMap.values()).map(c => ({
    country: c.country,
    countryCode: c.countryCode,
    providers: Array.from(c.providers),
    currencies: Array.from(c.currencies),
  }));
}

/**
 * Get all supported providers.
 */
export function getSupportedProviders(): PaymentProvider[] {
  return ['mtn_momo', 'airtel_money', 'mpesa'];
}

/**
 * Check if a phone number is routable to any mobile money provider.
 */
export function isMobileMoneyNumber(phone: string, defaultCountryCode?: string): boolean {
  return routeToProvider(phone, defaultCountryCode) !== null;
}
