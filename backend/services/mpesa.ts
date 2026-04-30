/**
 * M-Pesa (Safaricom Daraja) API Client
 * 
 * Implements the Safaricom Daraja API for STK Push (Lipa Na M-Pesa Online).
 * Docs: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
 * 
 * Flow:
 * 1. Get OAuth token using consumer key/secret
 * 2. POST /mpesa/stkpush/v1/processrequest — sends STK push to customer
 * 3. POST /mpesa/stkpushquery/v1/query — check status
 * 4. Receive callback at callbackUrl when payment completes
 */

import type {
  MobileMoneyProvider,
  MobileMoneyPaymentRequest,
  MobileMoneyPaymentResponse,
  MobileMoneyStatusResponse,
  MobileMoneyCallbackPayload,
  MobileMoneyStatus,
  MpesaConfig,
} from '../types/mobileMoney.js';

export class MpesaClient implements MobileMoneyProvider {
  readonly provider = 'mpesa' as const;
  readonly displayName = 'M-Pesa';

  private config: MpesaConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.config = {
      baseUrl: process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke',
      consumerKey: process.env.MPESA_CONSUMER_KEY || '',
      consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
      businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE || '',
      passkey: process.env.MPESA_PASSKEY || '',
      callbackUrl: process.env.MPESA_CALLBACK_URL
        || `${process.env.BACKEND_URL || 'http://localhost:2894'}/payments/webhook/mpesa`,
    };
  }

  isAvailable(): boolean {
    return !!(
      this.config.consumerKey &&
      this.config.consumerSecret &&
      this.config.businessShortCode &&
      this.config.passkey
    );
  }

  // ─── OAuth Token Management ──────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    const credentials = Buffer.from(
      `${this.config.consumerKey}:${this.config.consumerSecret}`
    ).toString('base64');

    const response = await fetch(
      `${this.config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('M-Pesa token error:', response.status, errorText);
      throw new Error(`M-Pesa authentication failed: ${response.status}`);
    }

    const data = await response.json() as {
      access_token: string;
      expires_in: string;
    };

    this.accessToken = data.access_token;
    // Safaricom returns expires_in as seconds string (usually "3599")
    this.tokenExpiresAt = Date.now() + (parseInt(data.expires_in) * 1000);

    return this.accessToken;
  }

  // ─── STK Push (Lipa Na M-Pesa Online) ────────────────────────────────────

  async requestPayment(request: MobileMoneyPaymentRequest): Promise<MobileMoneyPaymentResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        providerTransactionId: '',
        status: 'failed',
        error: 'M-Pesa is not configured',
        errorCode: 'PROVIDER_NOT_CONFIGURED',
      };
    }

    try {
      const token = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword(timestamp);

      // M-Pesa expects phone in format 254XXXXXXXXX (no +)
      const phone = request.customerPhone.replace('+', '');

      const body = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.ceil(request.amount), // M-Pesa only accepts whole numbers
        PartyA: phone,
        PartyB: this.config.businessShortCode,
        PhoneNumber: phone,
        CallBackURL: this.config.callbackUrl,
        AccountReference: request.externalId.substring(0, 12), // Max 12 chars
        TransactionDesc: (request.description || 'Payment').substring(0, 13), // Max 13 chars
      };

      const response = await fetch(
        `${this.config.baseUrl}/mpesa/stkpush/v1/processrequest`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json() as {
        MerchantRequestID?: string;
        CheckoutRequestID?: string;
        ResponseCode?: string;
        ResponseDescription?: string;
        CustomerMessage?: string;
        requestId?: string;
        errorCode?: string;
        errorMessage?: string;
      };

      // ResponseCode "0" means success
      if (data.ResponseCode === '0' && data.CheckoutRequestID) {
        return {
          success: true,
          providerTransactionId: data.CheckoutRequestID,
          status: 'pending',
          metadata: {
            merchantRequestId: data.MerchantRequestID,
            checkoutRequestId: data.CheckoutRequestID,
            customerMessage: data.CustomerMessage,
          },
        };
      }

      return {
        success: false,
        providerTransactionId: data.CheckoutRequestID || '',
        status: 'failed',
        error: data.ResponseDescription || data.errorMessage || 'M-Pesa STK push failed',
        errorCode: data.ResponseCode || data.errorCode || 'UNKNOWN',
      };
    } catch (error) {
      console.error('M-Pesa requestPayment error:', error);
      return {
        success: false,
        providerTransactionId: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'NETWORK_ERROR',
      };
    }
  }

  // ─── Check Payment Status (STK Query) ────────────────────────────────────

  async getPaymentStatus(providerTransactionId: string): Promise<MobileMoneyStatusResponse> {
    try {
      const token = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword(timestamp);

      const body = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: providerTransactionId,
      };

      const response = await fetch(
        `${this.config.baseUrl}/mpesa/stkpushquery/v1/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('M-Pesa status query error:', response.status, errorText);
        throw new Error(`Status query failed: ${response.status}`);
      }

      const data = await response.json() as {
        ResponseCode?: string;
        ResponseDescription?: string;
        MerchantRequestID?: string;
        CheckoutRequestID?: string;
        ResultCode?: string;
        ResultDesc?: string;
      };

      return {
        status: this.mapMpesaResultCode(data.ResultCode || ''),
        providerTransactionId,
        metadata: {
          merchantRequestId: data.MerchantRequestID,
          resultCode: data.ResultCode,
          resultDesc: data.ResultDesc,
        },
      };
    } catch (error) {
      console.error('M-Pesa getPaymentStatus error:', error);
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
      // M-Pesa STK callback structure
      const stkCallback = payload.Body?.stkCallback;
      if (!stkCallback) return null;

      const resultCode = String(stkCallback.ResultCode);
      const checkoutRequestId = stkCallback.CheckoutRequestID;

      // Extract callback metadata items
      let amount: number | undefined;
      let receiptNumber: string | undefined;
      let phone: string | undefined;

      if (stkCallback.CallbackMetadata?.Item) {
        for (const item of stkCallback.CallbackMetadata.Item) {
          switch (item.Name) {
            case 'Amount':
              amount = item.Value;
              break;
            case 'MpesaReceiptNumber':
              receiptNumber = item.Value;
              break;
            case 'PhoneNumber':
              phone = String(item.Value);
              break;
          }
        }
      }

      return {
        provider: 'mpesa',
        externalId: stkCallback.MerchantRequestID || '',
        providerTransactionId: checkoutRequestId || '',
        status: this.mapMpesaResultCode(resultCode),
        amount,
        financialTransactionId: receiptNumber,
        rawPayload: payload,
      };
    } catch (error) {
      console.error('M-Pesa callback parse error:', error);
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

  private getTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  private generatePassword(timestamp: string): string {
    const raw = `${this.config.businessShortCode}${this.config.passkey}${timestamp}`;
    return Buffer.from(raw).toString('base64');
  }

  private mapMpesaResultCode(resultCode: string): MobileMoneyStatus {
    const codeMap: Record<string, MobileMoneyStatus> = {
      '0': 'completed',           // Success
      '1': 'insufficient_funds',  // Insufficient balance
      '1032': 'cancelled',        // Request cancelled by user
      '1037': 'timeout',          // DS timeout
      '2001': 'failed',           // Wrong PIN
      '1001': 'failed',           // Unable to lock subscriber
      '1019': 'timeout',          // Transaction expired
      '1': 'failed',              // General failure
      '17': 'failed',             // Internal failure
    };

    return codeMap[resultCode] || 'failed';
  }
}

// Export singleton
export const mpesaClient = new MpesaClient();
