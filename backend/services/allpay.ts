import * as crypto from 'crypto';
import type {
    AllPayPaymentRequest,
    AllPayItem,
    AllPayPaymentResponse,
    AllPayWebhookPayload,
    AllPayApiError,
    MerchantConfig
} from '../types/index.js';

export class AllPayApiClient {
    private readonly apiUrl: string;
    private readonly apiMode: 'api8' | 'api11';
    private readonly legacySignatureFormat: boolean;
    private readonly login: string;
    private readonly apiKey: string;
    private readonly maxRetries: number = 3;
    private readonly retryDelay: number = 1000; // 1 second
    private readonly rateLimitDelay: number = 100; // 100ms between requests

    constructor() {
        // AllPay API URL from official documentation.
        // Defaults to api11; set ALLPAY_API_URL with mode=api8 (and optionally
        // ALLPAY_SIGNATURE_FORMAT=legacy) to fall back to the api8 wire format.
        const defaultApiUrl = 'https://allpay.to/app/?show=getpayment&mode=api11';
        let configuredApiUrl = defaultApiUrl;
        let configuredMode: 'api8' | 'api11' = 'api11';
        try {
            const candidate = new URL(process.env.ALLPAY_API_URL || defaultApiUrl);
            if (['allpay.to', 'allpay.co.il', 'www.allpay.co.il'].includes(candidate.hostname)
                && candidate.searchParams.get('show') === 'getpayment') {
                const mode = candidate.searchParams.get('mode');
                if (mode === 'api8' || mode === 'api11') {
                    configuredMode = mode;
                    configuredApiUrl = candidate.toString();
                }
            }
        } catch { /* A malformed endpoint falls back to the supported v11 API. */ }
        this.apiUrl = configuredApiUrl;
        this.apiMode = configuredMode;
        this.legacySignatureFormat = configuredMode === 'api8' || process.env.ALLPAY_SIGNATURE_FORMAT === 'legacy';
        this.login = process.env.ALLPAY_LOGIN || '';
        this.apiKey = process.env.ALLPAY_API_KEY || '';

        if (!this.login || !this.apiKey) {
            throw new Error('AllPay credentials not configured. Please set ALLPAY_LOGIN and ALLPAY_API_KEY environment variables.');
        }
    }

    /**
     * Create a payment request with AllPay API
     * Based on official AllPay API documentation
     */
    async createPayment(
        amount: number, 
        merchantConfig: MerchantConfig, 
        description?: string,
        options?: {
            lineItems?: Array<{ name: string; price: number; quantity: number; includesVat?: boolean }>;
            customerEmail?: string;
            customerName?: string;
            customerPhone?: string;
            customerIdNumber?: string;
            maxInstallments?: number;
            fixedInstallments?: boolean;
            expiresAt?: Date;
            preauthorize?: boolean;
            showApplePay?: boolean;
            showBit?: boolean;
            customField1?: string;
            customField2?: string;
            notificationsUrl?: string;
            successUrl?: string;
            backlinkUrl?: string;
            currencyDisplay?: 'UGX';
        }
    ): Promise<AllPayPaymentResponse & { order_id: string }> {
        return Promise.race([
            this._createPaymentInternal(amount, merchantConfig, description, options),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('AllPay API timeout')), 8000)
            )
        ]);
    }

    private async _createPaymentInternal(
        amount: number, 
        merchantConfig: MerchantConfig, 
        description?: string,
        options?: {
            lineItems?: Array<{ name: string; price: number; quantity: number; includesVat?: boolean }>;
            customerEmail?: string;
            customerName?: string;
            customerPhone?: string;
            customerIdNumber?: string;
            maxInstallments?: number;
            fixedInstallments?: boolean;
            expiresAt?: Date;
            preauthorize?: boolean;
            showApplePay?: boolean;
            showBit?: boolean;
            customField1?: string;
            customField2?: string;
            notificationsUrl?: string;
            successUrl?: string;
            backlinkUrl?: string;
            currencyDisplay?: 'UGX';
        }
    ): Promise<AllPayPaymentResponse & { order_id: string }> {
        // Create items array - use line items if provided, otherwise create single item
        // API v11 expects the item price in the payment currency, or in
        // currency_display when supplied. The payment page performs any
        // display-to-settlement conversion and shows both amounts.
        const items: AllPayItem[] = options?.lineItems && options.lineItems.length > 0
            ? options.lineItems.map(item => ({
            name: item.name,
                price: item.price,
                qty: item.quantity,
                vat: item.includesVat === false ? 3 : 1 // 3 = 0% VAT, 1 = 18% VAT included
            }))
            : [{
                name: description || 'Payment',
                price: amount,
                qty: 1,
                vat: 1 // 18% VAT included
            }];

        const orderId = this.generateOrderId();

        // Create the payment request according to AllPay API
        const request: AllPayPaymentRequest = {
            login: this.login,
            order_id: orderId,
            items: items,
            currency: merchantConfig.currency || 'ILS',
            lang: this.mapLanguage(merchantConfig.language || 'he'),
            webhook_url: options?.notificationsUrl || `${process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://pay-be.sb0.tech' : 'http://localhost:2894')}/payments/webhook`,
            success_url: options?.successUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success`,
            backlink_url: options?.backlinkUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failure`,
            expire: options?.expiresAt ? Math.floor(options.expiresAt.getTime() / 1000) : Math.floor(Date.now() / 1000) + 3600 // Default 1 hour
        };

        if (options?.currencyDisplay) request.currency_display = options.currencyDisplay;

        // Add optional fields
        if (options?.customerName) request.client_name = options.customerName;
        if (options?.customerEmail) request.client_email = options.customerEmail;
        if (options?.customerPhone) request.client_phone = options.customerPhone;
        if (options?.customerIdNumber) request.client_tehudat = options.customerIdNumber;
        if (options?.maxInstallments && options.maxInstallments >= 1 && options.maxInstallments <= 12) {
            request.inst = options.maxInstallments;
        }
        if (options?.fixedInstallments !== undefined) {
            request.inst_fixed = options.fixedInstallments ? 1 : 0;
        }
        if (options?.preauthorize) request.preauthorize = true;
        if (options?.showApplePay !== undefined) request.show_applepay = options.showApplePay;
        if (options?.showBit !== undefined) request.show_bit = options.showBit;
        if (options?.customField1) request.add_field_1 = options.customField1;
        if (options?.customField2) request.add_field_2 = options.customField2;

        if (!request.webhook_url?.startsWith('https://')) {
            throw new Error('A public HTTPS SB0 Pay webhook URL is required in production');
        }

        // Generate SHA256 signature
        request.sign = this.getApiSignature(request, this.apiKey);
        const response = await this.makeJsonRequest(request);

        // Return response with order_id included
        return {
            ...response,
            order_id: orderId
        };
    }

    /**
     * Validate webhook signature from AllPay
     * AllPay uses SHA256 signature validation
     */
    validateWebhookSignature(payload: AllPayWebhookPayload, receivedSignature?: string): boolean {
        try {
            // AllPay includes the signature in the payload itself
            const signatureToValidate = receivedSignature || payload.sign;

            if (!signatureToValidate) {
                console.error('No signature provided for validation');
                return false;
            }

            // Create expected signature using AllPay's SHA256 method
            const expectedSignature = this.getApiSignature(payload, this.apiKey);

            // Compare signatures using timing-safe comparison
            const receivedBuffer = Buffer.from(signatureToValidate);
            const expectedBuffer = Buffer.from(expectedSignature);

            if (receivedBuffer.length !== expectedBuffer.length) {
                return false;
            }

            return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
        } catch (error) {
            console.error('Error validating webhook signature:', error);
            return false;
        }
    }

    /**
     * Get payment status from AllPay using the payment status verification endpoint
     */
    async getPaymentStatus(orderId: string): Promise<AllPayPaymentResponse> {
        return Promise.race([
            this._getPaymentStatusInternal(orderId),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('AllPay status check timeout')), 8000)
            )
        ]);
    }

    private async _getPaymentStatusInternal(orderId: string): Promise<AllPayPaymentResponse> {
        const statusUrl = `https://allpay.to/app/?show=paymentstatus&mode=${this.apiMode}`;

        const request = {
            login: this.login,
            order_id: orderId
        };

        // Generate signature
        const signature = this.getApiSignature(request, this.apiKey);
        const requestWithSignature = {
            ...request,
            sign: signature
        };

        try {
            const response = await fetch(statusUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'SB0-Pay/1.0'
                },
                body: JSON.stringify(requestWithSignature)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const responseData = await response.json();
            return responseData as AllPayPaymentResponse;

        } catch (error) {
            console.error('Error getting payment status:', error);
            throw error;
        }
    }

    /**
     * Make JSON API request to AllPay
     */
    private async makeJsonRequest(request: AllPayPaymentRequest): Promise<AllPayPaymentResponse> {
        let lastError: AllPayApiError | null = null;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                // Rate limiting - wait between requests
                if (attempt > 1) {
                    await this.sleep(this.rateLimitDelay);
                }
                // Do not log payment payloads: they include customer PII and a
                // merchant-bound signature. Keep the provider URL out of logs too.

                const requestOptions: RequestInit = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'User-Agent': 'SB0-Pay/1.0'
                    },
                    body: JSON.stringify(request)
                };

                const response = await fetch(this.apiUrl, requestOptions);
                const responseText = await response.text();

                let responseData: any;
                try {
                    responseData = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('AllPay returned a non-JSON response');
                    throw new Error('AllPay returned an invalid response');
                }

                // Check if the response contains an error
                if (responseData.error_code || responseData.error_msg) {
                    const error: AllPayApiError = new Error(
                        responseData.error_msg || responseData.error || `AllPay API Error: ${responseData.error_code}`
                    ) as AllPayApiError;
                    error.code = responseData.error_code || 'ALLPAY_ERROR';
                    error.statusCode = response.status;
                    error.response = responseData;

                    console.error('AllPay API returned an error response', { code: error.code, status: error.statusCode });
                    throw error;
                }

                if (!response.ok) {
                    const error: AllPayApiError = new Error(
                        responseData.message || `HTTP ${response.status}: ${response.statusText}`
                    ) as AllPayApiError;
                    error.code = `HTTP_${response.status}`;
                    error.statusCode = response.status;
                    error.response = responseData;

                    // Don't retry on client errors (4xx), only on server errors (5xx) and network issues
                    if (response.status >= 400 && response.status < 500) {
                        throw error;
                    }

                    lastError = error;
                    console.warn(`AllPay API request failed (attempt ${attempt}/${this.maxRetries}):`, error.message);

                    if (attempt < this.maxRetries) {
                        await this.sleep(this.retryDelay * attempt); // Exponential backoff
                        continue;
                    }

                    throw error;
                }

                return responseData as AllPayPaymentResponse;

            } catch (error) {
                if (error instanceof TypeError && error.message.includes('fetch')) {
                    // Network error - retry
                    const networkError: AllPayApiError = new Error(`Network error: ${error.message}`) as AllPayApiError;
                    networkError.code = 'NETWORK_ERROR';
                    lastError = networkError;

                    console.warn(`Network error on attempt ${attempt}/${this.maxRetries}:`, error.message);

                    if (attempt < this.maxRetries) {
                        await this.sleep(this.retryDelay * attempt);
                        continue;
                    }
                }

                // Re-throw non-network errors or if we've exhausted retries
                throw error;
            }
        }

        // This should never be reached, but just in case
        throw lastError || new Error('Unknown error occurred during API request');
    }

    /**
     * Generate SHA256 signature for AllPay API requests
     * Based on AllPay documentation - exact implementation.
     * api11 includes only non-empty string values; api8 (legacy) includes any
     * non-empty stringified value.
     */
    private getApiSignature(params: Record<string, any>, apiKey: string): string {
        // Step 1: Remove the sign parameter from the request
        const paramsCopy = { ...params };
        delete paramsCopy.sign;

        // Step 2 & 3: Sort keys alphabetically and collect non-empty values
        const sortedKeys = Object.keys(paramsCopy).sort();
        const chunks: string[] = [];

        const appendValue = (value: unknown) => {
            if (!this.legacySignatureFormat) {
                if (typeof value === 'string' && value.trim() !== '') chunks.push(value);
                return;
            }
            if (value !== null && value !== undefined && String(value).trim() !== '') chunks.push(String(value));
        };

        for (const key of sortedKeys) {
            const value = paramsCopy[key];

            if (Array.isArray(value)) {
                // Handle arrays (like items)
                for (const item of value) {
                    if (typeof item === 'object' && item !== null) {
                        // Sort object keys and add non-empty values
                        const itemKeys = Object.keys(item).sort();
                        for (const itemKey of itemKeys) {
                            const itemValue = item[itemKey];
                            appendValue(itemValue);
                        }
                    } else appendValue(item);
                }
            } else {
                appendValue(value);
            }
        }

        // Step 4: Join values with colon separator
        // Step 5: Append API key with colon
        const signature = chunks.join(':') + ':' + apiKey;

        // Never log the canonical string: it ends with the merchant API key.
        // Step 6: Apply SHA256 algorithm
        const hash = crypto.createHash('sha256').update(signature, 'utf8').digest('hex');

        return hash;
    }

    /**
     * Generate unique order ID
     */
    private generateOrderId(): string {
        return `SB0-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }

    /**
     * Map internal language codes to AllPay language codes
     */
    private mapLanguage(language: string): string {
        const languageMap: Record<string, string> = {
            'he': 'HE',
            'en': 'EN',
            'ar': 'AR',
            'ru': 'RU'
        };

        return languageMap[language.toLowerCase()] || 'AUTO';
    }

    /**
     * Sleep utility for delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Issue a refund for a payment
     * Based on AllPay refund API documentation
     */
    async refundPayment(orderId: string, amount: number, items?: Array<{ amount: number }>): Promise<{
        order_id: string;
        status: number; // 3 = refunded, 4 = partially refunded
    }> {
        return Promise.race([
            this._refundPaymentInternal(orderId, amount, items),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('AllPay refund timeout')), 8000)
            )
        ]);
    }

    private async _refundPaymentInternal(orderId: string, amount: number, items?: Array<{ amount: number }>): Promise<{
        order_id: string;
        status: number;
    }> {
        const refundUrl = `https://allpay.to/app/?show=refund&mode=${this.apiMode}`;

        const request: any = {
            login: this.login,
            order_id: orderId,
            amount
        };

        // Add items for partial refund if provided
        if (items) {
            request.items = items.map((it) => ({ amount: it.amount }));
        }

        // Generate signature
        const signature = this.getApiSignature(request, this.apiKey);
        const requestWithSignature = {
            ...request,
            sign: signature
        };

        try {
            // Never log signed refund payloads or customer payment details.

            const response = await fetch(refundUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'SB0-Pay/1.0'
                },
                body: JSON.stringify(requestWithSignature)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const responseData = await response.json() as any;
            // Provider response may contain customer and payment details.

            // Check for errors
            if (responseData.error_code || responseData.error_msg) {
                throw new Error(responseData.error_msg || `AllPay refund error: ${responseData.error_code}`);
            }

            return {
                order_id: responseData.order_id || orderId,
                status: responseData.status || 3
            };

        } catch (error) {
            console.error('Error processing refund:', error);
            throw error;
        }
    }

    /**
     * Health check for AllPay API
     */
    async healthCheck(): Promise<boolean> {
        try {
            // Create timeout controller for compatibility
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            // Test with AllPay's domain
            const response = await fetch('https://allpay.to/', {
                method: 'GET',
                headers: {
                    'User-Agent': 'SB0-Pay/1.0'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            console.error('AllPay API health check failed:', error);
            return false;
        }
    }
}

// Export singleton instance
export const allPayClient = new AllPayApiClient();
