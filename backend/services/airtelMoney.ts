/**
 * Airtel Money API Client
 * 
 * Implements the Airtel Money Africa API for collection (receiving payments).
 * Docs: https://developers.airtel.africa/documentation
 * 
 * Flow:
 * 1. Get OAuth token using client credentials
 * 2. POST /merchant/v2/payments/ — sends USSD push to customer
 * 3. GET /standard/v1/payments/{id} — check transaction status
 * 4. Receive callback when payment completes
 */

import type {
  MobileMoneyProvider,
  MobileMoneyPaymentRequest,
  MobileMoneyPaymentResponse,
  MobileMoneyStatusResponse,
  MobileMoneyCallbackPayload,
  MobileMoneyStatus,
  AirtelMoneyConfig,
} from '../types/mobileMoney.js';

export class AirtelMoneyClient implements MobileMoneyProvider {
  readonly provider = 'airtel_money' as const;
  readonly displayName = 'Airtel Money';

  private config: AirtelMoneyConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.config = {
      baseUrl: process.env.AIRTEL_MONEY_BASE_URL || 'https://openapiuat.airtel.africa',
      clientId: process.env.AIRTEL_MONEY_CLIENT_ID || '',
      clientSecret: process.env.AIRTEL_MONEY_CLIENT_SECRET || '',
      callbackUrl: process.env.AIRTEL_MONEY_CALLBACK_URL
        || `${process.env.BACKEND_URL || 'http://localhost:2894'}/payments/webhook/airtel-money`,
    };
  }

  isAvailable(): boolean {
    return !!(this.config.clientId && this.config.clientSecret);
  }

  // ─── OAuth Token Management ──────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    const response = await fetch(`${this.config.baseUrl}/auth/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtel Money token error:', response.status, errorText);
      throw new Error(`Airtel Money authentication failed: ${response.status}`);
    }

    const data = await response.json() as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    return this.accessToken;
  }

  // ─── Request Payment (USSD Push) ─────────────────────────────────────────

  async requestPayment(request: MobileMoneyPaymentRequest): Promise<MobileMoneyPaymentResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        providerTransactionId: '',
        status: 'failed',
        error: 'Airtel Money is not configured',
        errorCode: 'PROVIDER_NOT_CONFIGURED',
      };
    }

    try {
      const token = await this.getAccessToken();

      // Airtel expects phone without country code prefix in the subscriber object,
      // and the country code separately. We'll extract from E.164.
      const phoneDigits = request.customerPhone.replace('+', '');
      // Derive country code from the phone number (first 1-3 digits)
      const { countryCode, subscriberNumber } = this.splitPhone(phoneDigits);

      const body = {
        reference: request.externalId,
        subscriber: {
          country: this.getCountryFromCode(countryCode),
          currency: request.currency,
          msisdn: subscriberNumber,
        },
        transaction: {
          amount: request.amount,
          country: this.getCountryFromCode(countryCode),
          currency: request.currency,
          id: request.externalId,
        },
      };

      const response = await fetch(`${this.config.baseUrl}/merchant/v2/payments/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Country': this.getCountryFromCode(countryCode),
          'X-Currency': request.currency,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json() as {
        data?: {
          transaction?: {
            id?: string;
            status?: string;
          };
        };
        status?: {
          code?: string;
          message?: string;
          result_code?: string;
          response_code?: string;
          success?: boolean;
        };
      };

      // Airtel returns 200 with status in body
      const statusCode = data.status?.response_code || data.status?.code;
      const isSuccess = statusCode === 'DP00800001001' || data.status?.success === true;

      if (isSuccess) {
        return {
          success: true,
          providerTransactionId: data.data?.transaction?.id || request.externalId,
          status: 'pending',
          metadata: {
            airtelTransactionId: data.data?.transaction?.id,
            statusCode,
          },
        };
      }

      return {
        success: false,
        providerTransactionId: data.data?.transaction?.id || '',
        status: 'failed',
        error: data.status?.message || `Airtel Money request failed`,
        errorCode: statusCode || 'UNKNOWN',
      };
    } catch (error) {
      console.error('Airtel Money requestPayment error:', error);
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
        `${this.config.baseUrl}/standard/v1/payments/${providerTransactionId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Airtel Money status check error:', response.status, errorText);
        throw new Error(`Status check failed: ${response.status}`);
      }

      const data = await response.json() as {
        data?: {
          transaction?: {
            id?: string;
            status?: string;
            message?: string;
            airtel_money_id?: string;
          };
        };
        status?: {
          code?: string;
          message?: string;
          response_code?: string;
          success?: boolean;
        };
      };

      const txStatus = data.data?.transaction?.status;

      return {
        status: this.mapAirtelStatus(txStatus || ''),
        providerTransactionId,
        financialTransactionId: data.data?.transaction?.airtel_money_id,
        metadata: {
          airtelStatus: txStatus,
          message: data.data?.transaction?.message,
        },
      };
    } catch (error) {
      console.error('Airtel Money getPaymentStatus error:', error);
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
      const transaction = payload.transaction || payload.data?.transaction;
      if (!transaction) return null;

      return {
        provider: 'airtel_money',
        externalId: transaction.id || payload.reference || '',
        providerTransactionId: transaction.airtel_money_id || transaction.id || '',
        status: this.mapAirtelStatus(transaction.status || payload.status?.code || ''),
        amount: transaction.amount ? parseFloat(transaction.amount) : undefined,
        currency: transaction.currency,
        financialTransactionId: transaction.airtel_money_id,
        rawPayload: payload,
      };
    } catch (error) {
      console.error('Airtel Money callback parse error:', error);
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

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private mapAirtelStatus(status: string): MobileMoneyStatus {
    const statusMap: Record<string, MobileMoneyStatus> = {
      'TS': 'completed',          // Transaction Successful
      'TF': 'failed',             // Transaction Failed
      'TA': 'pending',            // Transaction Ambiguous (still processing)
      'TIP': 'processing',        // Transaction In Progress
      'SUCCESS': 'completed',
      'FAILED': 'failed',
      'PENDING': 'pending',
      'IN_PROGRESS': 'processing',
    };

    return statusMap[status?.toUpperCase()] || 'failed';
  }

  /**
   * Split E.164 digits into country code and subscriber number.
   * Uses known country code lengths (1-3 digits).
   */
  private splitPhone(digits: string): { countryCode: string; subscriberNumber: string } {
    // Try 3-digit, then 2-digit, then 1-digit country codes
    const knownCodes = [
      '256', '254', '255', '233', '237', '225', '250', '229', '242', '224',
      '260', '235', '243', '241', '261', '227', '234', '248', '265', '258',
      '266', '251', '268', '231', '211', '20', '27', '91', '94', '93',
    ];

    for (const code of knownCodes) {
      if (digits.startsWith(code)) {
        return {
          countryCode: code,
          subscriberNumber: digits.substring(code.length),
        };
      }
    }

    // Fallback: assume first 3 digits are country code
    return {
      countryCode: digits.substring(0, 3),
      subscriberNumber: digits.substring(3),
    };
  }

  /**
   * Map country calling code to ISO 3166-1 alpha-2.
   */
  private getCountryFromCode(code: string): string {
    const map: Record<string, string> = {
      '256': 'UG', '254': 'KE', '255': 'TZ', '233': 'GH', '237': 'CM',
      '225': 'CI', '250': 'RW', '229': 'BJ', '242': 'CG', '224': 'GN',
      '260': 'ZM', '235': 'TD', '243': 'CD', '241': 'GA', '261': 'MG',
      '227': 'NE', '234': 'NG', '248': 'SC', '265': 'MW', '258': 'MZ',
      '266': 'LS', '251': 'ET', '268': 'SZ', '231': 'LR', '211': 'SS',
      '20': 'EG', '27': 'ZA', '91': 'IN', '94': 'LK', '93': 'AF',
    };

    return map[code] || 'UG';
  }
}

// Export singleton
export const airtelMoneyClient = new AirtelMoneyClient();
