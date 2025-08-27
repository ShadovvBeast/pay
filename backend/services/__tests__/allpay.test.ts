import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, mock } from 'bun:test';
import crypto from 'crypto';
import { AllPayApiClient } from '../allpay';
import type { MerchantConfig, AllPayWebhookPayload } from '../../types';

// Mock fetch globally
const mockFetch = mock();
global.fetch = mockFetch as any;

describe('AllPayApiClient', () => {
  let client: AllPayApiClient;
  let mockMerchantConfig: MerchantConfig;

  beforeAll(() => {
    // Set required environment variables
    process.env.ALLPAY_API_URL = 'https://allpay.to/app/?show=getpayment&mode=api8';
    process.env.ALLPAY_LOGIN = 'test_login';
    process.env.ALLPAY_API_KEY = 'test_api_key';
  });

  beforeEach(() => {
    client = new AllPayApiClient();
    mockMerchantConfig = {
      merchantId: 'TEST_MERCHANT',
      terminalId: 'TEST_TERMINAL',
      successUrl: 'https://example.com/success',
      failureUrl: 'https://example.com/failure',
      notificationUrl: 'https://example.com/webhook',
      currency: 'ILS',
      language: 'he'
    };
    
    mockFetch.mockClear();
  });

  afterAll(() => {
    // Clean up environment variables
    delete process.env.ALLPAY_API_URL;
    delete process.env.ALLPAY_LOGIN;
    delete process.env.ALLPAY_API_KEY;
  });

  describe('constructor', () => {
    it('should throw error when credentials are missing', () => {
      const originalLogin = process.env.ALLPAY_LOGIN;
      const originalApiKey = process.env.ALLPAY_API_KEY;
      
      delete process.env.ALLPAY_LOGIN;
      delete process.env.ALLPAY_API_KEY;

      expect(() => new AllPayApiClient()).toThrow(
        'AllPay credentials not configured. Please set ALLPAY_LOGIN and ALLPAY_API_KEY environment variables.'
      );

      // Restore environment variables
      process.env.ALLPAY_LOGIN = originalLogin;
      process.env.ALLPAY_API_KEY = originalApiKey;
    });

    it('should initialize with default API URL when not provided', () => {
      const originalUrl = process.env.ALLPAY_API_URL;
      delete process.env.ALLPAY_API_URL;
      
      const testClient = new AllPayApiClient();
      expect(testClient).toBeDefined();
      
      process.env.ALLPAY_API_URL = originalUrl;
    });
  });

  describe('createPayment', () => {
    it('should create payment successfully', async () => {
      const mockResponse = {
        payment_url: 'https://allpay.to/payment/12345'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.createPayment(100.50, mockMerchantConfig, 'Test payment');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://allpay.to/app/?show=getpayment&mode=api8',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'SB0-Pay/1.0'
          }),
          body: expect.stringContaining('"login":"test_login"') &&
                expect.stringContaining('"amount":10050') &&
                expect.stringContaining('"currency":"ILS"') &&
                expect.stringContaining('"lang":"HE"')
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors correctly', async () => {
      const mockErrorResponse = {
        error: 'Invalid amount'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify(mockErrorResponse),
        json: async () => mockErrorResponse
      });

      await expect(client.createPayment(-10, mockMerchantConfig)).rejects.toThrow(
        'Invalid amount'
      );
    });

    it('should retry on server errors', async () => {
      // First two calls fail with 500, third succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Server Error'
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Server Error'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ payment_url: 'https://allpay.to/payment/12345' })
        });

      const result = await client.createPayment(100, mockMerchantConfig);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.payment_url).toBe('https://allpay.to/payment/12345');
    });

    it('should not retry on client errors (4xx)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({ error: 'Invalid request' }),
        json: async () => ({ error: 'Invalid request' })
      });

      await expect(client.createPayment(100, mockMerchantConfig)).rejects.toThrow('Invalid request');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors with retry', async () => {
      // First call fails with network error, second succeeds
      mockFetch
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ payment_url: 'https://allpay.to/payment/12345' })
        });

      const result = await client.createPayment(100, mockMerchantConfig);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.payment_url).toBe('https://allpay.to/payment/12345');
    });

    it('should generate correct request structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ payment_url: 'https://allpay.to/payment/12345' })
      });

      await client.createPayment(100.50, mockMerchantConfig, 'Test payment');

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      
      expect(requestBody).toMatchObject({
        login: 'test_login',
        items: [{
          name: 'Test payment',
          price: 100.50,
          qty: 1,
          vat: 1
        }],
        amount: 10050,
        currency: 'ILS',
        lang: 'HE',
        notifications_url: 'https://example.com/webhook',
        success_url: 'https://example.com/success',
        backlink_url: 'https://example.com/failure'
      });

      expect(requestBody.order_id).toMatch(/^SB0-\d+-[a-z0-9]+$/);
      expect(requestBody.sign).toBeDefined();
      expect(requestBody.expire).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe('validateWebhookSignature', () => {
    it('should validate correct webhook signature', () => {
      const payload: AllPayWebhookPayload = {
        order_id: 'SB0-12345-abc',
        transaction_id: 'TXN_12345',
        status: 'completed',
        amount: 10000,
        currency: 'ILS'
      };

      // Create expected signature using SHA256
      const payloadCopy = { ...payload };
      const jsonString = JSON.stringify(payloadCopy);
      const expectedSignature = crypto
        .createHash('sha256')
        .update(jsonString + 'test_api_key', 'utf8')
        .digest('hex');

      const isValid = client.validateWebhookSignature(payload, expectedSignature);
      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const payload: AllPayWebhookPayload = {
        order_id: 'SB0-12345-abc',
        transaction_id: 'TXN_12345',
        status: 'completed',
        amount: 10000,
        currency: 'ILS'
      };

      const invalidSignature = 'invalid_signature';
      const isValid = client.validateWebhookSignature(payload, invalidSignature);
      expect(isValid).toBe(false);
    });

    it('should handle signature validation errors gracefully', () => {
      const payload: AllPayWebhookPayload = {
        order_id: 'SB0-12345-abc',
        transaction_id: 'TXN_12345',
        status: 'completed',
        amount: 10000,
        currency: 'ILS'
      };

      // Pass undefined signature
      const isValid = client.validateWebhookSignature(payload);
      expect(isValid).toBe(false);
    });
  });

  describe('getPaymentStatus', () => {
    it('should throw error as AllPay does not provide status endpoint', async () => {
      await expect(client.getPaymentStatus('TXN_12345')).rejects.toThrow(
        'AllPay does not provide a payment status endpoint. Use webhook notifications instead.'
      );
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      });

      const isHealthy = await client.healthCheck();

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://allpay.to/');
      expect(options.method).toBe('GET');
      expect(options.headers['User-Agent']).toBe('SB0-Pay/1.0');
      expect(isHealthy).toBe(true);
    });

    it('should return false when API is unhealthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      });

      const isHealthy = await client.healthCheck();
      expect(isHealthy).toBe(false);
    });

    it('should return false when network error occurs', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const isHealthy = await client.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe('signature generation', () => {
    it('should generate SHA256 signature correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ payment_url: 'https://allpay.to/payment/12345' })
      });

      await client.createPayment(100, mockMerchantConfig);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const { sign, ...requestWithoutSign } = requestBody;
      
      // Recreate the signature
      const jsonString = JSON.stringify(requestWithoutSign);
      const expectedSignature = crypto
        .createHash('sha256')
        .update(jsonString + 'test_api_key', 'utf8')
        .digest('hex');

      expect(sign).toBe(expectedSignature);
    });
  });

  describe('language mapping', () => {
    it('should map language codes correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ payment_url: 'https://allpay.to/payment/12345' })
      });

      const testCases = [
        { input: 'he', expected: 'HE' },
        { input: 'en', expected: 'EN' },
        { input: 'ar', expected: 'AR' },
        { input: 'ru', expected: 'RU' },
        { input: 'unknown', expected: 'AUTO' }
      ];

      for (const testCase of testCases) {
        mockFetch.mockClear();
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ payment_url: 'https://allpay.to/payment/12345' })
        });

        const configWithLang = { ...mockMerchantConfig, language: testCase.input };
        await client.createPayment(100, configWithLang);

        const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(requestBody.lang).toBe(testCase.expected);
      }
    });
  });
});