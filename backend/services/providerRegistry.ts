/**
 * Payment Provider Registry
 * 
 * Central registry for all payment providers (AllPay + mobile money).
 * Handles provider lookup, routing, and availability checks.
 */

import type {
  PaymentProvider,
  PaymentMethod,
  MobileMoneyProvider,
  MobileMoneyPaymentRequest,
  MobileMoneyPaymentResponse,
  MobileMoneyStatusResponse,
  MobileMoneyCallbackPayload,
  ProviderRouteResult,
} from '../types/mobileMoney.js';
import { mtnMomoClient } from './mtnMomo.js';
import { airtelMoneyClient } from './airtelMoney.js';
import { mpesaClient } from './mpesa.js';
import { routeToProvider, getSupportedCountries, isMobileMoneyNumber } from './phoneRouter.js';

// ─── Provider Registry ───────────────────────────────────────────────────────

class ProviderRegistry {
  private providers: Map<PaymentProvider, MobileMoneyProvider> = new Map();

  constructor() {
    this.providers.set('mtn_momo', mtnMomoClient);
    this.providers.set('airtel_money', airtelMoneyClient);
    this.providers.set('mpesa', mpesaClient);
  }

  /**
   * Get a specific mobile money provider client.
   */
  getProvider(provider: PaymentProvider): MobileMoneyProvider | undefined {
    return this.providers.get(provider);
  }

  /**
   * Route a phone number to the appropriate provider and return routing info.
   * Returns null if the phone number doesn't match any mobile money provider.
   */
  routePayment(phone: string, defaultCountryCode?: string): ProviderRouteResult | null {
    return routeToProvider(phone, defaultCountryCode);
  }

  /**
   * Request a mobile money payment, auto-routing by phone number.
   * 
   * @param request - Payment request with customer phone
   * @param forceProvider - Override auto-routing with a specific provider
   */
  async requestPayment(
    request: MobileMoneyPaymentRequest,
    forceProvider?: PaymentProvider
  ): Promise<MobileMoneyPaymentResponse & { provider: PaymentProvider; paymentMethod: PaymentMethod }> {
    let targetProvider: PaymentProvider;
    let paymentMethod: PaymentMethod;

    if (forceProvider) {
      targetProvider = forceProvider;
      paymentMethod = forceProvider as PaymentMethod;
    } else {
      const route = this.routePayment(request.customerPhone);
      if (!route) {
        return {
          success: false,
          providerTransactionId: '',
          status: 'failed',
          error: `No mobile money provider found for phone number: ${request.customerPhone}`,
          errorCode: 'NO_PROVIDER_FOUND',
          provider: 'mtn_momo', // placeholder
          paymentMethod: 'mobile_money',
        };
      }
      targetProvider = route.provider;
      paymentMethod = route.paymentMethod;
    }

    const client = this.providers.get(targetProvider);
    if (!client) {
      return {
        success: false,
        providerTransactionId: '',
        status: 'failed',
        error: `Provider ${targetProvider} is not registered`,
        errorCode: 'PROVIDER_NOT_REGISTERED',
        provider: targetProvider,
        paymentMethod,
      };
    }

    if (!client.isAvailable()) {
      return {
        success: false,
        providerTransactionId: '',
        status: 'failed',
        error: `Provider ${client.displayName} is not configured. Please set the required environment variables.`,
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        provider: targetProvider,
        paymentMethod,
      };
    }

    const response = await client.requestPayment(request);
    return {
      ...response,
      provider: targetProvider,
      paymentMethod,
    };
  }

  /**
   * Check payment status with a specific provider.
   */
  async getPaymentStatus(
    provider: PaymentProvider,
    providerTransactionId: string
  ): Promise<MobileMoneyStatusResponse> {
    const client = this.providers.get(provider);
    if (!client) {
      return {
        status: 'failed',
        providerTransactionId,
        error: `Provider ${provider} is not registered`,
      };
    }

    return client.getPaymentStatus(providerTransactionId);
  }

  /**
   * Parse a callback/webhook payload from a specific provider.
   */
  parseCallback(
    provider: PaymentProvider,
    payload: Record<string, any>,
    headers?: Record<string, string>
  ): MobileMoneyCallbackPayload | null {
    const client = this.providers.get(provider);
    if (!client) return null;
    return client.parseCallback(payload, headers);
  }

  /**
   * Check if a phone number can be routed to a mobile money provider.
   */
  isMobileMoneyNumber(phone: string, defaultCountryCode?: string): boolean {
    return isMobileMoneyNumber(phone, defaultCountryCode);
  }

  /**
   * Get all available (configured) providers.
   */
  getAvailableProviders(): Array<{ provider: PaymentProvider; displayName: string; available: boolean }> {
    return Array.from(this.providers.entries()).map(([key, client]) => ({
      provider: key,
      displayName: client.displayName,
      available: client.isAvailable(),
    }));
  }

  /**
   * Get supported countries and their providers.
   */
  getSupportedCountries() {
    return getSupportedCountries();
  }

  /**
   * Health check all providers.
   */
  async healthCheckAll(): Promise<Record<PaymentProvider, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [key, client] of this.providers) {
      try {
        results[key] = await client.healthCheck();
      } catch {
        results[key] = false;
      }
    }

    return results as Record<PaymentProvider, boolean>;
  }
}

// Export singleton
export const providerRegistry = new ProviderRegistry();
