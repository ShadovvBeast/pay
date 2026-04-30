/**
 * Mobile Money Provider Types
 * Shared types for MTN MoMo, Airtel Money, M-Pesa, and future providers
 */

// ─── Payment Methods & Providers ─────────────────────────────────────────────

export type PaymentMethod = 'card' | 'mtn_momo' | 'airtel_money' | 'mpesa' | 'mobile_money';
export type PaymentProvider = 'allpay' | 'mtn_momo' | 'airtel_money' | 'mpesa';

// ─── Provider Interface ──────────────────────────────────────────────────────

export interface MobileMoneyPaymentRequest {
  /** Amount in major currency units (e.g., 5000 UGX, 100 KES) */
  amount: number;
  /** ISO 4217 currency code */
  currency: string;
  /** Customer phone number in E.164 format (e.g., +256771234567) */
  customerPhone: string;
  /** Payment description */
  description?: string;
  /** Unique reference for this transaction */
  externalId: string;
  /** URL to receive payment status callbacks */
  callbackUrl: string;
  /** Optional payer message shown on their phone */
  payerMessage?: string;
  /** Optional payee note for merchant records */
  payeeNote?: string;
}

export interface MobileMoneyPaymentResponse {
  /** Whether the request was accepted (not necessarily completed) */
  success: boolean;
  /** Provider's transaction/reference ID */
  providerTransactionId: string;
  /** Current status of the payment */
  status: MobileMoneyStatus;
  /** Provider-specific metadata */
  metadata?: Record<string, any>;
  /** Error message if failed */
  error?: string;
  /** Error code from provider */
  errorCode?: string;
}

export type MobileMoneyStatus =
  | 'pending'       // Request accepted, waiting for customer confirmation
  | 'processing'    // Customer confirmed, processing
  | 'completed'     // Payment successful
  | 'failed'        // Payment failed
  | 'cancelled'     // Customer cancelled/rejected
  | 'timeout'       // Customer didn't respond in time
  | 'insufficient_funds'; // Not enough balance

export interface MobileMoneyStatusResponse {
  status: MobileMoneyStatus;
  providerTransactionId: string;
  financialTransactionId?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface MobileMoneyCallbackPayload {
  provider: PaymentProvider;
  externalId: string;
  providerTransactionId: string;
  status: MobileMoneyStatus;
  amount?: number;
  currency?: string;
  financialTransactionId?: string;
  rawPayload: Record<string, any>;
}

// ─── Provider Client Interface ───────────────────────────────────────────────

export interface MobileMoneyProvider {
  /** Provider identifier */
  readonly provider: PaymentProvider;
  /** Human-readable name */
  readonly displayName: string;
  /** Request a payment from a customer */
  requestPayment(request: MobileMoneyPaymentRequest): Promise<MobileMoneyPaymentResponse>;
  /** Check the status of a payment */
  getPaymentStatus(providerTransactionId: string): Promise<MobileMoneyStatusResponse>;
  /** Validate and parse a webhook/callback payload */
  parseCallback(payload: Record<string, any>, headers?: Record<string, string>): MobileMoneyCallbackPayload | null;
  /** Check if the provider is configured and available */
  isAvailable(): boolean;
  /** Health check */
  healthCheck(): Promise<boolean>;
}

// ─── Phone Prefix Routing ────────────────────────────────────────────────────

export interface PhonePrefixEntry {
  /** Country calling code without + (e.g., "256" for Uganda) */
  countryCode: string;
  /** ISO 3166-1 alpha-2 country code (e.g., "UG") */
  country: string;
  /** Network prefixes after country code (e.g., ["77", "78"] for MTN Uganda) */
  prefixes: string[];
  /** Provider to route to */
  provider: PaymentProvider;
  /** Default currency for this country */
  currency: string;
  /** Whether this provider is active in this country */
  active: boolean;
}

// ─── Provider Configuration ──────────────────────────────────────────────────

export interface MtnMomoConfig {
  /** MTN MoMo API base URL (sandbox or production) */
  baseUrl: string;
  /** Collection API subscription key */
  subscriptionKey: string;
  /** API user ID (X-Reference-Id from provisioning) */
  apiUserId: string;
  /** API key generated for the user */
  apiKey: string;
  /** Target environment: 'sandbox' or provider-specific like 'mtnuganda' */
  targetEnvironment: string;
  /** Callback host URL */
  callbackHost: string;
}

export interface AirtelMoneyConfig {
  /** Airtel Money API base URL */
  baseUrl: string;
  /** Client ID from Airtel developer portal */
  clientId: string;
  /** Client secret */
  clientSecret: string;
  /** Callback URL for payment notifications */
  callbackUrl: string;
}

export interface MpesaConfig {
  /** M-Pesa API base URL (sandbox or production) */
  baseUrl: string;
  /** Consumer key from Safaricom developer portal */
  consumerKey: string;
  /** Consumer secret */
  consumerSecret: string;
  /** Business short code */
  businessShortCode: string;
  /** Passkey for STK push */
  passkey: string;
  /** Callback URL for payment notifications */
  callbackUrl: string;
}

// ─── Provider Routing Result ─────────────────────────────────────────────────

export interface ProviderRouteResult {
  provider: PaymentProvider;
  paymentMethod: PaymentMethod;
  country: string;
  currency: string;
  /** Normalized phone number in E.164 format */
  normalizedPhone: string;
}
