import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { paymentService } from '../../services/payment';
import { allPayClient } from '../../services/allpay';
import { transactionRepository } from '../../services/transactionRepository';
import { userRepository } from '../../services/repository';
import { db } from '../../services/database';
import { hashPassword } from '../../utils/password';
import type { User, CreateUserData, Transaction } from '../../types';

// Test data
const testUserData: CreateUserData = {
  email: 'payment-simple-test@example.com',
  password: 'TestPassword123!',
  shopName: 'Payment Simple Test Shop',
  ownerName: 'Payment Simple Test Owner',
  merchantConfig: {
    merchantId: 'TEST_MERCHANT_123',
    terminalId: 'TEST_TERMINAL_456',
    successUrl: 'https://example.com/success',
    failureUrl: 'https://example.com/failure',
    notificationUrl: 'https://example.com/webhook',
    currency: 'ILS',
    language: 'he'
  }
};

let testUser: User;
let testTransaction: Transaction;

// Mock AllPay client for testing
const mockAllPayClient = {
  createPayment: async (amount: number, merchantConfig: any, description?: string) => {
    const orderId = `SB0-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      payment_url: `https://allpay.test/pay/${Math.random().toString(36).substr(2, 9)}`,
      order_id: orderId,
      success: true
    };
  },
  validateWebhookSignature: (payload: any, signature?: string) => true,
  getPaymentStatus: async (orderId: string) => {
    return {
      order_id: orderId,
      status: 1, // 1 = successful payment
      amount: 10000, // Amount in agorot
      currency: 'ILS'
    };
  }
};

describe('Payment Service Integration Tests', () => {
  beforeAll(async () => {
    // Initialize test database
    await db.initialize();
    
    // Mock AllPay client
    Object.assign(allPayClient, mockAllPayClient);
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM transactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['%payment-simple-test%']);
    await db.query('DELETE FROM users WHERE email LIKE $1', ['%payment-simple-test%']);
    
    // Create test user with hashed password
    const hashedPassword = await hashPassword(testUserData.password);
    const userDataWithHash = {
      ...testUserData,
      password: hashedPassword
    };
    testUser = await userRepository.create(userDataWithHash);
  });

  afterEach(async () => {
    // Clean up test data
    if (testTransaction) {
      await db.query('DELETE FROM transactions WHERE id = $1', [testTransaction.id]);
    }
    await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
  });

  describe('Payment Creation', () => {
    it('should create a payment successfully', async () => {
      const paymentRequest = {
        amount: 100.50,
        description: 'Test payment',
        customerEmail: 'customer@example.com'
      };

      const result = await paymentService.createPayment(testUser, paymentRequest);

      expect(result).toHaveProperty('transaction');
      expect(result).toHaveProperty('paymentUrl');
      expect(result).toHaveProperty('qrCodeDataUrl');
      
      expect(result.transaction.amount).toBe(paymentRequest.amount);
      expect(result.transaction.status).toBe('pending');
      expect(result.transaction.userId).toBe(testUser.id);
      expect(result.paymentUrl).toMatch(/^https:\/\/allpay\.test\/pay\//);
      expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

      testTransaction = result.transaction;
    });

    it('should reject invalid amount', async () => {
      const paymentRequest = {
        amount: -10,
        description: 'Invalid payment'
      };

      await expect(paymentService.createPayment(testUser, paymentRequest))
        .rejects.toThrow('Amount must be a positive number');
    });

    it('should reject amount exceeding maximum', async () => {
      const paymentRequest = {
        amount: 1000000,
        description: 'Too large payment'
      };

      await expect(paymentService.createPayment(testUser, paymentRequest))
        .rejects.toThrow('Amount exceeds maximum allowed value');
    });
  });

  describe('Payment Status', () => {
    beforeEach(async () => {
      // Create a test transaction
      testTransaction = await transactionRepository.create({
        userId: testUser.id,
        amount: 75.25,
        currency: 'ILS',
        paymentUrl: 'https://allpay.test/pay/test123',
        allpayTransactionId: 'SB0-test-order-123'
      });
    });

    it('should get payment status successfully', async () => {
      const transaction = await paymentService.getPaymentStatus(testTransaction.id);

      expect(transaction.id).toBe(testTransaction.id);
      expect(transaction.amount).toBe(testTransaction.amount);
      expect(transaction.userId).toBe(testUser.id);
    });

    it('should throw error for non-existent transaction', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await expect(paymentService.getPaymentStatus(fakeId))
        .rejects.toThrow('Transaction not found');
    });
  });

  describe('Transaction History', () => {
    beforeEach(async () => {
      // Create multiple test transactions
      const transactions = [
        { amount: 100.00, status: 'completed' },
        { amount: 50.00, status: 'pending' },
        { amount: 75.50, status: 'failed' }
      ];

      for (const txData of transactions) {
        await transactionRepository.create({
          userId: testUser.id,
          amount: txData.amount,
          currency: 'ILS',
          paymentUrl: `https://allpay.test/pay/${Math.random().toString(36).substr(2, 9)}`
        });
        
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });

    it('should get transaction history successfully', async () => {
      const transactions = await paymentService.getTransactionHistory(testUser.id);

      expect(transactions).toBeInstanceOf(Array);
      expect(transactions.length).toBeGreaterThanOrEqual(3);
      
      // Check that all transactions belong to the test user
      transactions.forEach(transaction => {
        expect(transaction.userId).toBe(testUser.id);
      });
    });

    it('should support pagination', async () => {
      const transactions = await paymentService.getTransactionHistory(testUser.id, 2, 1);

      expect(transactions.length).toBeLessThanOrEqual(2);
    });

    it('should get transaction count', async () => {
      const count = await paymentService.getTransactionCount(testUser.id);

      expect(count).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Payment Cancellation', () => {
    beforeEach(async () => {
      // Create a pending test transaction
      testTransaction = await transactionRepository.create({
        userId: testUser.id,
        amount: 125.75,
        currency: 'ILS',
        paymentUrl: 'https://allpay.test/pay/cancel123'
      });
    });

    it('should cancel pending payment successfully', async () => {
      const cancelledTransaction = await paymentService.cancelPayment(testTransaction.id, testUser.id);

      expect(cancelledTransaction.id).toBe(testTransaction.id);
      expect(cancelledTransaction.status).toBe('cancelled');
    });

    it('should not cancel completed payment', async () => {
      // Update transaction to completed status
      await transactionRepository.updateStatus(testTransaction.id, 'completed');

      await expect(paymentService.cancelPayment(testTransaction.id, testUser.id))
        .rejects.toThrow('Can only cancel pending transactions');
    });

    it('should not allow cancelling other users transactions', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      
      await expect(paymentService.cancelPayment(testTransaction.id, fakeUserId))
        .rejects.toThrow('Unauthorized to cancel this transaction');
    });
  });

  describe('Webhook Processing', () => {
    beforeEach(async () => {
      // Create a test transaction
      testTransaction = await transactionRepository.create({
        userId: testUser.id,
        amount: 200.00,
        currency: 'ILS',
        paymentUrl: 'https://allpay.test/pay/webhook123',
        allpayTransactionId: 'allpay_webhook_123'
      });
    });

    it('should process webhook successfully', async () => {
      const webhookPayload = {
        order_id: `SB0-${Date.now()}-test`,
        transaction_id: 'allpay_webhook_123',
        status: 'completed',
        amount: 20000, // Amount in agorot
        currency: 'ILS',
        sign: 'test_signature'
      };

      const result = await paymentService.processWebhook(webhookPayload, 'test_signature');

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeTruthy();
    });

    it('should reject webhook with invalid signature', async () => {
      // Mock invalid signature validation
      const originalValidate = allPayClient.validateWebhookSignature;
      allPayClient.validateWebhookSignature = () => false;

      const webhookPayload = {
        order_id: `SB0-${Date.now()}-test`,
        transaction_id: 'allpay_webhook_123',
        status: 'completed',
        amount: 20000,
        currency: 'ILS',
        sign: 'invalid_signature'
      };

      const result = await paymentService.processWebhook(webhookPayload, 'invalid_signature');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid signature');

      // Restore original method
      allPayClient.validateWebhookSignature = originalValidate;
    });
  });

  describe('Payment Statistics', () => {
    beforeEach(async () => {
      // Create transactions with different statuses
      const transactions = [
        { amount: 100.00, status: 'completed' },
        { amount: 50.00, status: 'completed' },
        { amount: 75.50, status: 'pending' },
        { amount: 25.00, status: 'failed' }
      ];

      for (const txData of transactions) {
        const transaction = await transactionRepository.create({
          userId: testUser.id,
          amount: txData.amount,
          currency: 'ILS',
          paymentUrl: `https://allpay.test/pay/${Math.random().toString(36).substr(2, 9)}`
        });

        // Update status if not pending
        if (txData.status !== 'pending') {
          await transactionRepository.updateStatus(transaction.id, txData.status as any);
        }
      }
    });

    it('should get payment statistics', async () => {
      const stats = await paymentService.getPaymentStats(testUser.id);

      expect(stats.totalTransactions).toBeGreaterThanOrEqual(4);
      expect(stats.completedTransactions).toBeGreaterThanOrEqual(2);
      expect(stats.pendingTransactions).toBeGreaterThanOrEqual(1);
      expect(stats.failedTransactions).toBeGreaterThanOrEqual(1);
      expect(stats.totalAmount).toBeGreaterThanOrEqual(150); // 100 + 50 from completed
    });
  });

  describe('Performance Tests', () => {
    it('should create payment within 3 seconds', async () => {
      const paymentRequest = {
        amount: 100.00,
        description: 'Performance test payment'
      };

      const startTime = Date.now();
      
      const result = await paymentService.createPayment(testUser, paymentRequest);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toHaveProperty('transaction');
      expect(duration).toBeLessThan(3000); // Less than 3 seconds

      testTransaction = result.transaction;
    });

    it('should handle concurrent payment requests', async () => {
      const paymentRequest = {
        amount: 50.00,
        description: 'Concurrent test payment'
      };

      const requests = Array.from({ length: 5 }, (_, i) =>
        paymentService.createPayment(testUser, {
          ...paymentRequest,
          description: `${paymentRequest.description} ${i + 1}`
        })
      );

      const results = await Promise.all(requests);
      
      // All requests should succeed
      results.forEach(result => {
        expect(result).toHaveProperty('transaction');
        expect(result).toHaveProperty('paymentUrl');
        expect(result).toHaveProperty('qrCodeDataUrl');
      });

      // Clean up created transactions
      for (const result of results) {
        await db.query('DELETE FROM transactions WHERE id = $1', [result.transaction.id]);
      }
    });
  });
});