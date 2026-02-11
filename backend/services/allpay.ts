import * as crypto from 'crypto';
import type {
    AllPayPaymentRequest,
    AllPayPaymentResponse,
    AllPayWebhookPayload,
    AllPayApiError,
    MerchantConfig
} from '../types/index.js';

export class AllPayApiClient {
    private readonly apiUrl: string;
    private readonly login: string;
    private readonly apiKey: string;
    private readonly maxRetries: number = 3;
    private readonly retryDelay: number = 1000; // 1 second
    private readonly rateLimitDelay: number = 100; // 100ms between requests

    constructor() {
        // AllPay API URL from official documentation
        this.apiUrl = process.env.ALLPAY_API_URL || 'https://allpay.to/app/?show=getpayment&mode=api8';
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
        }
    ): Promise<AllPayPaymentResponse & { order_id: string }> {
        // Create items array - use line items if provided, otherwise create single item
        // IMPORTANT: AllPay expects item prices in main currency units (shekels), NOT agorot
        // Only the total 'amount' field should be in agorot
        const items: AllPayItem[] = options?.lineItems && options.lineItems.length > 0
            ? options.lineItems.map(item => ({
                name: item.name,
                price: item.price, // Keep in shekels (main currency unit)
                qty: item.quantity,
                vat: item.includesVat === false ? 3 : 1 // 3 = 0% VAT, 1 = 18% VAT included
            }))
            : [{
                name: description || 'Payment',
                price: amount, // Keep in shekels (main currency unit)
                qty: 1,
                vat: 1 // 18% VAT included
            }];

        const orderId = this.generateOrderId();

        // Create the payment request according to AllPay API
        const request: AllPayPaymentRequest = {
            login: this.login,
            order_id: orderId,
            items: items,
            amount: Math.round(amount * 100), // Amount in agorot
            currency: merchantConfig.currency || 'ILS',
            lang: this.mapLanguage(merchantConfig.language || 'he'),
            notifications_url: options?.notificationsUrl || `${process.env.BACKEND_URL || 'http://localhost:2894'}/payments/webhook`,
            success_url: options?.successUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success`,
            backlink_url: options?.backlinkUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failure`,
            expire: options?.expiresAt ? Math.floor(options.expiresAt.getTime() / 1000) : Math.floor(Date.now() / 1000) + 3600 // Default 1 hour
        };

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
        const statusUrl = 'https://allpay.to/app/?show=paymentstatus&mode=api8';

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
                console.log('Making JSON request to AllPay:', JSON.stringify(request, null, 2));
                console.log('API URL:', this.apiUrl);

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
                console.log('Response status:', response.status, response.statusText);

                const responseText = await response.text();
                console.log('Response body:', responseText);

                let responseData: any;
                try {
                    responseData = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('Failed to parse response as JSON:', parseError);
                    throw new Error(`Invalid JSON response: ${responseText}`);
                }

                // Check if the response contains an error
                if (responseData.error_code || responseData.error_msg) {
                    const error: AllPayApiError = new Error(
                        responseData.error_msg || responseData.error || `AllPay API Error: ${responseData.error_code}`
                    ) as AllPayApiError;
                    error.code = responseData.error_code || 'ALLPAY_ERROR';
                    error.statusCode = response.status;
                    error.response = responseData;

                    console.error('AllPay API returned error:', responseData);
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
     * Based on AllPay documentation - exact implementation
     */
    private getApiSignature(params: Record<string, any>, apiKey: string): string {
        // Step 1: Remove the sign parameter from the request
        const paramsCopy = { ...params };
        delete paramsCopy.sign;

        // Step 2 & 3: Sort keys alphabetically and collect non-empty values
        const sortedKeys = Object.keys(paramsCopy).sort();
        const chunks: string[] = [];

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
                            if (itemValue !== null && itemValue !== undefined && String(itemValue).trim() !== '') {
                                chunks.push(String(itemValue));
                            }
                        }
                    } else if (item !== null && item !== undefined && String(item).trim() !== '') {
                        chunks.push(String(item));
                    }
                }
            } else {
                // Handle regular values
                if (value !== null && value !== undefined && String(value).trim() !== '') {
                    chunks.push(String(value));
                }
            }
        }

        // Step 4: Join values with colon separator
        // Step 5: Append API key with colon
        const signature = chunks.join(':') + ':' + apiKey;

        console.log('Signature generation debug:');
        console.log('Sorted keys:', sortedKeys);
        console.log('Chunks:', chunks);
        console.log('String to hash:', signature);

        // Step 6: Apply SHA256 algorithm
        const hash = crypto.createHash('sha256').update(signature, 'utf8').digest('hex');
        console.log('Generated signature:', hash);

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
        const refundUrl = 'https://allpay.to/app/?show=refund&mode=api8';

        // AllPay expects amounts in minor units (agorot/cents)
        const amountMinor = Math.round(amount * 100);

        const request: any = {
            login: this.login,
            order_id: orderId,
            amount: amountMinor
        };

        // Add items for partial refund if provided
        if (items) {
            request.items = items.map((it) => ({
                amount: Math.round(it.amount * 100)
            }));
        }

        // Generate signature
        const signature = this.getApiSignature(request, this.apiKey);
        const requestWithSignature = {
            ...request,
            sign: signature
        };

        try {
            console.log('Making refund request to AllPay (minor units):', JSON.stringify(requestWithSignature, null, 2));

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
            console.log('AllPay refund response:', responseData);

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