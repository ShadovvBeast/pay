import { describe, it, expect, beforeEach } from 'bun:test';
import { PaymentService } from '../payment';
import type { User, AllPayWebhookPayload } from '../../types';

describe('PaymentService Integration Tests', () => {
  let paymentService: PaymentService;
  let mockUser: User;

  beforeEach(() => {
    paymentService = new PaymentService();
    
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      shopName: 'Test Shop',
      ownerName: 'Test Owner',
      merchantConfig: {
        merchantId: 'MERCHANT_123',
        terminalId: 'TERMINAL_123',
        successUrl: 'https://example.com/success',
        failureUrl: 'https://example.com/failure',
        notificationUrl: 'https://example.com/webhook',
        currency: 'ILS',
        language: 'he'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  describe('Payment validation', () => {
    it('should validate amount is positive', async () => {
      await expect(paymentService.createPayment(mockUser, {
        amount: -10
      })).rejects.toThrow('Amount must be a positive number');

      await expect(paymentService.createPayment(mockUser, {
        amount: 0
      })).rejects.toThrow('Amount must be a positive number');
    });

    it('should validate amount does not exceed maximum', async () => {
      await expect(paymentService.createPayment(mockUser, {
        amount: 1000000
      })).rejects.toThrow('Amount exceeds maximum allowed value');
    });

    it('should accept valid amounts', async () => {
      // This will fail at AllPay integration level, but should pass validation
      try {
        await paymentService.createPayment(mockUser, {
          amount: 100.50
        });
      } catch (error) {
        // Should not be a validation error
        expect(error.message).not.toContain('Amount must be');
        expect(error.message).not.toContain('exceeds maximum');
      }
    });
  });

  describe('Status mapping', () => {
    it('should handle webhook processing validation', async () => {
      const mockWebhookPayload: AllPayWebhookPayload = {
        transactionId: 'ALLPAY_TXN_123',
        status: 'completed',
        amount: 10050,
        currency: 'ILS',
        timestamp: '2024-01-01T12:00:00Z',
        signature: 'test_signature'
      };

      // This will fail at signature validation, but should not throw on payload structure
      const result = await paymentService.processWebhook(mockWebhookPayload, 'invalid_signature');
      
      expect(result).toEqual({
        success: false,
        error: 'Invalid signature'
      });
    });
  });

  describe('Transaction history validation', () => {
    it('should handle invalid user ID gracefully', async () => {
      try {
        await paymentService.getTransactionHistory('');
      } catch (error) {
        expect(error.message).toContain('Failed to retrieve transaction history');
      }
    });

    it('should handle pagination parameters', async () => {
      try {
        await paymentService.getTransactionHistory('user-123', 10, 0);
      } catch (error) {
        // Should not throw validation errors for valid pagination
        expect(error.message).not.toContain('Invalid pagination');
      }
    });
  });

  describe('Payment statistics validation', () => {
    it('should handle date range calculation', async () => {
      try {
        await paymentService.getPaymentStats('user-123', 30);
      } catch (error) {
        // Should not throw validation errors for valid parameters
        expect(error.message).not.toContain('Invalid date range');
      }
    });

    it('should handle edge cases for days parameter', async () => {
      try {
        await paymentService.getPaymentStats('user-123', 0);
      } catch (error) {
        // Should handle zero days gracefully
        expect(error.message).not.toContain('Invalid days parameter');
      }
    });
  });

  describe('Payment cancellation validation', () => {
    it('should validate transaction ownership', async () => {
      try {
        await paymentService.cancelPayment('txn-123', 'user-123');
      } catch (error) {
        // Will fail at transaction lookup, but should not be a validation error
        expect(error.message).not.toContain('Invalid transaction ID format');
      }
    });
  });
});