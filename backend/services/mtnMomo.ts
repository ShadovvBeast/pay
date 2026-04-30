/**
 * MTN Mobile Money (MoMo) API Client
 * 
 * Implements the MTN MoMo Open API Collection product.
 * Docs: https://momodeveloper.mtn.com/api-documentation/collection/
 * 
 * Flow:
 * 1. Get OAuth token using API user credentials
 * 2. POST /collection/v1_0/requesttopay — sends payment prompt to customer
 * 3. GET /collection/v1_0/requesttopay/{referenceId} — check status
 * 4. Receive callback at callbackUrl when payment completes
 */

import * as crypto from 'crypto';
import type {
  MobileMoneyProvider,
  MobileMoneyPaymentRequest,
  MobileMoneyPaymentResponse,
  MobileMoneyStatusResponse,
  MobileMoneyCallbackPayload,
  MobileMoneyStatus,
  MtnMomoConfig,
} from '../types/mobileMoney.js';

export class MtnMomoClient implements MobileMoneyProvider {
  readonly provider = 'mtn_momo' as const;
  readonly displayName = 'MTN Mobile Money';

  private config: MtnMomoConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.config = {
      baseUrl: process.env.MTN_MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com',
      subscriptionKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY || '',
      apiUserId: process.env.MTN_MOMO_API_USER_ID || '',
      apiKey: process.env.MTN_MOMO_API_KEY || '',
      targetEnvironment: process.env.MTN_MOMO_ENVIRONMENT || 'sandbox',
      callbackHost: process.env.MTN_MOMO_CALLBACK_HOST || process.env.BACKEND_URL || 'http://localhost:2894',
    };
  }

  isAvailable(): boolean {
    return !!(this.config.subscriptionKey && this.config.apiUserId && this.config.apiKey);
  }

  // ─── OAuth Token Management ──────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    const credentials = Buffer.from(`${this.config.apiUserId}:${this.config.apiKey}`).toString('base64');

    const response = await fetch(`${this.config.baseUrl}/collection/token/`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MTN MoMo token error:', response.status, errorText);
      throw new Error(`MTN MoMo authentication failed: ${response.status}`);
    }

    const data = await response.json() as { access_token: string; token_type: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    return this.accessToken;
  }

  // ─── Request to Pay ──────────────────────────────────────────────────────

  async requestPayment(request: MobileMoneyPaymentRequest): Promise<MobileMoneyPaymentResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        providerTransactionId: '',
        status: 'failed',
        error: 'MTN MoMo is not configured',
        errorCode: 'PROVIDER_NOT_CONFIGURED',
      };
    }

    try {
      const token = await this.getAccessToken();
      const referenceId = crypto.randomUUID();

      const body = {
        amount: String(request.amount),
        currency: request.currency,
        externalId: request.externalId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: request.customerPhone.replace('+', ''),
        },
        payerMessage: request.payerMessage || request.description || 'Payment',
        payeeNote: request.payeeNote || `SB0Pay-${request.externalId}`,
      };

      const response = await fetch(`${this.config.baseUrl}/collection/v1_0/requesttopay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment': this.config.targetEnvironment,
          'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
          'Content-Type': 'application/json',
          'X-Callback-Url': `${this.config.callbackHost}/payments/webhook/mtn-momo`,
        },
        body: JSON.stringify(body),
      });

      // MTN MoMo returns 202 Accepted for successful request-to-pay
      if (response.status === 202) {
        return {
          success: true,
          providerTransactionId: referenceId,
          status: 'pending',
          metadata: {
            referenceId,
            externalId: request.externalId,
          },
        };
      }

      const errorData = await response.text();
      console.error('MTN MoMo requesttopay error:', response.status, errorData);

      let errorMessage = `MTN MoMo request failed: ${response.status}`;
      let errorCode = `HTTP_${response.status}`;

      try {
        const parsed = JSON.parse(errorData);
        errorMessage = parsed.message || parsed.reason || errorMessage;
        errorCode = parsed.code || errorCode;
      } catch {}

      return {
        success: false,
        providerTransactionId: referenceId,
        status: 'failed',
        error: errorMessage,
        errorCode,
      };
    } catch (error) {
      console.error('MTN MoMo requestPayment error:', error);
      return {
        success: false,
        providerTransactionId: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'NETWORK_ERROR',
      };
    }
  }

  // ─── Check Payment Status ────────────────────────────────────────────────

  async getPaymentStatus(providerTransactionId: string): Promise<MobileMoneyStatusResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `${this.config.baseUrl}/collection/v1_0/requesttopay/${providerTransactionId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Target-Environment': this.config.targetEnvironment,
            'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('MTN MoMo status check error:', response.status, errorText);
        throw new Error(`Status check failed: ${response.status}`);
      }

      const data = await response.json() as {
        amount: string;
        currency: string;
        financialTransactionId?: string;
        externalId: string;
        payer: { partyIdType: string; partyId: string };
        status: string;
        reason?: { code: string; message: string };
      };

      return {
        status: this.mapMtnStatus(data.status),
        providerTransactionId,
        financialTransactionId: data.financialTransactionId,
        amount: parseFloat(data.amount),
        currency: data.currency,
        metadata: {
          externalId: data.externalId,
          payer: data.payer,
          reason: data.reason,
        },
      };
    } catch (error) {
      console.error('MTN MoMo getPaymentStatus error:', error);
      return {
        status: 'failed',
        providerTransactionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ─── Callback Parsing ────────────────────────────────────────────────────

  parseCallback(payload: Record<string, any>): MobileMoneyCallbackPayload | null {
    try {
      // MTN MoMo callback format
      if (!payload.externalId && !payload.referenceId) {
        return null;
      }

      return {
        provider: 'mtn_momo',
        externalId: payload.externalId || '',
        providerTransactionId: payload.referenceId || '',
        status: this.mapMtnStatus(payload.status),
        amount: payload.amount ? parseFloat(payload.amount) : undefined,
        currency: payload.currency,
        financialTransactionId: payload.financialTransactionId,
        rawPayload: payload,
      };
    } catch (error) {
      console.error('MTN MoMo callback parse error:', error);
      return null;
    }
  }

  // ─── Health Check ────────────────────────────────────────────────────────

  async healthCheck(): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await this.getAccessToken();
      return true;
    } catch {
      return false;
    }
  }

  // ─── Status Mapping ──────────────────────────────────────────────────────

  private mapMtnStatus(status: string): MobileMoneyStatus {
    const statusMap: Record<string, MobileMoneyStatus> = {
      'PENDING': 'pending',
      'SUCCESSFUL': 'completed',
      'FAILED': 'failed',
      'REJECTED': 'cancelled',
      'TIMEOUT': 'timeout',
      'EXPIRED': 'timeout',
    };

    return statusMap[status?.toUpperCase()] || 'failed';
  }
}

// Export singleton
export const mtnMomoClient = new MtnMomoClient();
