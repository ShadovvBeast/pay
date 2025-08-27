import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { cookie } from '@elysiajs/cookie';
import { jwt } from '@elysiajs/jwt';
import { paymentController } from '../payment';
import { authController } from '../auth';
import { db } from '../../services/database';
import { userRepository } from '../../services/repository';
import { transactionRepository } from '../../services/transactionRepository';
import { paymentService } from '../../services/payment';
import { allPayClient } from '../../services/allpay';
import { hashPassword } from '../../utils/password';
import type { User, CreateUserData, Transaction } from '../../types';

// Test configuration - use same secret as auth service
const TEST_JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Test app setup
const createTestApp = () => {
  return new Elysia()
    .use(cors({
      origin: true,
      credentials: true
    }))
    .use(cookie())
    .use(jwt({
      name: 'jwt',
      secret: TEST_JWT_SECRET
    }))
    .use(authController)
    .use(paymentController);
};

// Test data
const testUserData: CreateUserData = {
  email: 'payment-test@example.com',
  password: 'TestPassword123!',
  shopName: 'Payment Test Shop',
  ownerName: 'Payment Test Owner',
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

let testApp: Elysia;
let testUser: User;
let authToken: string;
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

describe('Payment Controller Integration Tests', () => {
  beforeAll(async () => {
    // Initialize test database
    await db.initialize();
    
    // Create test app
    testApp = createTestApp();
    
    // Mock AllPay client
    Object.assign(allPayClient, mockAllPayClient);
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM transactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['%payment-test%']);
    await db.query('DELETE FROM users WHERE email LIKE $1', ['%payment-test%']);
    
    // Create test user with hashed password
    const hashedPassword = await hashPassword(testUserData.password);
    const userDataWithHash = {
      ...testUserData,
      password: hashedPassword
    };
    testUser = await userRepository.create(userDataWithHash);
    
    // Login to get auth token
    const loginResponse = await testApp
      .handle(new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testUserData.email,
          password: testUserData.password
        })
      }));
    
    expect(loginResponse.status).toBe(200);
    
    // Extract token from Set-Cookie header
    const setCookieHeader = loginResponse.headers.get('Set-Cookie');
    const tokenMatch = setCookieHeader?.match(/accessToken=([^;]+)/);
    authToken = tokenMatch?.[1] || '';
    expect(authToken).toBeTruthy();
  });

  afterEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM transactions WHERE user_id = $1', [testUser.id]);
    await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
  });

  describe('POST /payments', () => {
    it('should create a payment successfully', async () => {
      const paymentData = {
        amount: 100.50,
        description: 'Test payment',
        customerEmail: 'customer@example.com'
      };

      const response = await testApp
        .handle(new Request('http://localhost/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `accessToken=${authToken}`
          },
          body: JSON.stringify(paymentData)
        }));

      expect(response.status).toBe(201);
      
      const responseData = await response.json();
      expect(responseData).toHaveProperty('transaction');
      expect(responseData).toHaveProperty('paymentUrl');
      expect(responseData).toHaveProperty('qrCodeDataUrl');
      
      expect(responseData.transaction.amount).toBe(paymentData.amount);
      expect(responseData.transaction.status).toBe('pending');
      expect(responseData.paymentUrl).toMatch(/^https:\/\/allpay\.test\/pay\//);
      expect(responseData.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('should reject invalid amount', async () => {
      const paymentData = {
        amount: -10,
        description: 'Invalid payment'
      };

      const response = await testApp
        .handle(new Request('http://localhost/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `accessToken=${authToken}`
          },
          body: JSON.stringify(paymentData)
        }));

      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error.code).toBe('INVALID_AMOUNT');
    });

    it('should reject amount exceeding maximum', async () => {
      const paymentData = {
        amount: 1000000,
        description: 'Too large payment'
      };

      const response = await testApp
        .handle(new Request('http://localhost/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `accessToken=${authToken}`
          },
          body: JSON.stringify(paymentData)
        }));

      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error.code).toBe('AMOUNT_TOO_LARGE');
    });

    it('should require authentication', async () => {
      const paymentData = {
        amount: 50.00,
        description: 'Unauthorized payment'
      };

      const response = await testApp
        .handle(new Request('http://localhost/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(paymentData)
        }));

      expect(response.status).toBe(401);
      
      const responseData = await response.json();
      expect(responseData.error.code).toBe('UNAUTHORIZED');
    });

    it('should validate request body schema', async () => {
      const invalidPaymentData = {
        amount: 'invalid',
        customerEmail: 'not-an-email'
      };

      const response = await testApp
        .handle(new Request('http://localhost/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `accessToken=${authToken}`
          },
          body: JSON.stringify(invalidPaymentData)
        }));

      expect(response.status).toBe(400);
    });
  });

  describe('GET /payments/:id/status', () => {
    beforeEach(async () => {
      // Create a test transaction
      testTransaction = await transactionRepository.create({
        userId: testUser.id,
        amount: 75.25,
        currency: 'ILS',
        paymentUrl: 'https://allpay.test/pay/test123',
        allpayTransactionId: 'allpay_test_123'
      });
    });

    it('should get payment status successfully', async () => {
      const response = await testApp
        .handle(new Request(`http://localhost/payments/${testTransaction.id}/status`, {
          method: 'GET',
          headers: {
            'Cookie': `accessToken=${authToken}`
          }
        }));

      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.transaction.id).toBe(testTransaction.id);
      expect(responseData.transaction.amount).toBe(testTransaction.amount);
      expect(responseData.transaction.status).toBe(testTransaction.status);
    });

    it('should return 404 for non-existent transaction', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await testApp
        .handle(new Request(`http://localhost/payments/${fakeId}/status`, {
          method: 'GET',
          headers: {
            'Cookie': `accessToken=${authToken}`
          }
        }));

      expect(response.status).toBe(404);
      
      const responseData = await response.json();
      expect(responseData.error.code).toBe('TRANSACTION_NOT_FOUND');
    });

    it('should deny access to other users transactions', async () => {
      // Create another user
      const otherUserData = {
        ...testUserData,
        email: 'other-payment-test@example.com'
      };
      const hashedPassword = await hashPassword(otherUserData.password);
      const otherUser = await userRepository.create({
        ...otherUserData,
        password: hashedPassword
      });
      
      // Create transaction for other user
      const otherTransaction = await transactionRepository.create({
        userId: otherUser.id,
        amount: 50.00,
        currency: 'ILS',
        paymentUrl: 'https://allpay.test/pay/other123'
      });

      const response = await testApp
        .handle(new Request(`http://localhost/payments/${otherTransaction.id}/status`, {
          method: 'GET',
          headers: {
            'Cookie': `accessToken=${authToken}`
          }
        }));

      expect(response.status).toBe(403);
      
      const responseData = await response.json();
      expect(responseData.error.code).toBe('FORBIDDEN');
      
      // Cleanup
      await db.query('DELETE FROM transactions WHERE id = $1', [otherTransaction.id]);
      await db.query('DELETE FROM users WHERE id = $1', [otherUser.id]);
    });

    it('should require authentication', async () => {
      const response = await testApp
        .handle(new Request(`http://localhost/payments/${testTransaction.id}/status`, {
          method: 'GET'
        }));

      expect(response.status).toBe(401);
    });
  });

  describe('GET /payments/history', () => {
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
      const response = await testApp
        .handle(new Request('http://localhost/payments/history', {
          method: 'GET',
          headers: {
            'Cookie': `accessToken=${authToken}`
          }
        }));

      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData).toHaveProperty('transactions');
      expect(responseData).toHaveProperty('pagination');
      expect(responseData.transactions).toBeInstanceOf(Array);
      expect(responseData.transactions.length).toBeGreaterThanOrEqual(3);
      expect(responseData.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it('should support pagination', async () => {
      const response = await testApp
        .handle(new Request('http://localhost/payments/history?limit=2&offset=1', {
          method: 'GET',
          headers: {
            'Cookie': `accessToken=${authToken}`
          }
        }));

      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.transactions.length).toBeLessThanOrEqual(2);
      expect(responseData.pagination.limit).toBe(2);
      expect(responseData.pagination.offset).toBe(1);
    });

    it('should limit maximum page size', async () => {
      const response = await testApp
        .handle(new Request('http://localhost/payments/history?limit=200', {
          method: 'GET',
          headers: {
            'Cookie': `accessToken=${authToken}`
          }
        }));

      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.pagination.limit).toBe(100); // Max limit
    });

    it('should require authentication', async () => {
      const response = await testApp
        .handle(new Request('http://localhost/payments/history', {
          method: 'GET'
        }));

      expect(response.status).toBe(401);
    });
  });

  describe('POST /payments/:id/cancel', () => {
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
      const response = await testApp
        .handle(new Request(`http://localhost/payments/${testTransaction.id}/cancel`, {
          method: 'POST',
          headers: {
            'Cookie': `accessToken=${authToken}`
          }
        }));

      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.transaction.id).toBe(testTransaction.id);
      expect(responseData.transaction.status).toBe('cancelled');
    });

    it('should not cancel completed payment', async () => {
      // Update transaction to completed status
      await transactionRepository.updateStatus(testTransaction.id, 'completed');

      const response = await testApp
        .handle(new Request(`http://localhost/payments/${testTransaction.id}/cancel`, {
          method: 'POST',
          headers: {
            'Cookie': `accessToken=${authToken}`
          }
        }));

      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error.code).toBe('INVALID_STATUS');
    });

    it('should return 404 for non-existent transaction', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await testApp
        .handle(new Request(`http://localhost/payments/${fakeId}/cancel`, {
          method: 'POST',
          headers: {
            'Cookie': `accessToken=${authToken}`
          }
        }));

      expect(response.status).toBe(404);
      
      const responseData = await response.json();
      expect(responseData.error.code).toBe('TRANSACTION_NOT_FOUND');
    });

    it('should require authentication', async () => {
      const response = await testApp
        .handle(new Request(`http://localhost/payments/${testTransaction.id}/cancel`, {
          method: 'POST'
        }));

      expect(response.status).toBe(401);
    });
  });

  describe('POST /payments/webhook', () => {
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

      const response = await testApp
        .handle(new Request('http://localhost/payments/webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-AllPay-Signature': 'test_signature'
          },
          body: JSON.stringify(webhookPayload)
        }));

      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.transactionId).toBeTruthy();
    });

    it('should reject webhook with missing payload', async () => {
      const response = await testApp
        .handle(new Request('http://localhost/payments/webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }));

      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error.code).toBe('MISSING_PAYLOAD');
    });

    it('should not require authentication for webhook', async () => {
      const webhookPayload = {
        order_id: `SB0-${Date.now()}-test`,
        transaction_id: 'allpay_webhook_123',
        status: 'completed',
        amount: 20000,
        currency: 'ILS',
        sign: 'test_signature'
      };

      const response = await testApp
        .handle(new Request('http://localhost/payments/webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(webhookPayload)
        }));

      // Should not return 401 (unauthorized)
      expect(response.status).not.toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle AllPay API errors gracefully', async () => {
      // Mock AllPay to throw an error
      const originalCreatePayment = allPayClient.createPayment;
      allPayClient.createPayment = async () => {
        throw new Error('AllPay API is down');
      };

      const paymentData = {
        amount: 100.00,
        description: 'Test payment with API error'
      };

      const response = await testApp
        .handle(new Request('http://localhost/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `accessToken=${authToken}`
          },
          body: JSON.stringify(paymentData)
        }));

      expect(response.status).toBe(502);
      
      const responseData = await response.json();
      expect(responseData.error.code).toBe('PAYMENT_PROVIDER_ERROR');

      // Restore original method
      allPayClient.createPayment = originalCreatePayment;
    });

    it('should handle database errors gracefully', async () => {
      // Mock transaction repository to throw an error
      const originalCreate = transactionRepository.create;
      transactionRepository.create = async () => {
        throw new Error('Database connection failed');
      };

      const paymentData = {
        amount: 100.00,
        description: 'Test payment with DB error'
      };

      const response = await testApp
        .handle(new Request('http://localhost/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `accessToken=${authToken}`
          },
          body: JSON.stringify(paymentData)
        }));

      expect(response.status).toBe(500);
      
      const responseData = await response.json();
      expect(responseData.error.code).toBe('INTERNAL_ERROR');

      // Restore original method
      transactionRepository.create = originalCreate;
    });
  });

  describe('Performance Tests', () => {
    it('should create payment within 3 seconds', async () => {
      const paymentData = {
        amount: 100.00,
        description: 'Performance test payment'
      };

      const startTime = Date.now();
      
      const response = await testApp
        .handle(new Request('http://localhost/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `accessToken=${authToken}`
          },
          body: JSON.stringify(paymentData)
        }));

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(201);
      expect(duration).toBeLessThan(3000); // Less than 3 seconds
    });

    it('should handle concurrent payment requests', async () => {
      const paymentData = {
        amount: 50.00,
        description: 'Concurrent test payment'
      };

      const requests = Array.from({ length: 5 }, (_, i) =>
        testApp.handle(new Request('http://localhost/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `accessToken=${authToken}`
          },
          body: JSON.stringify({
            ...paymentData,
            description: `${paymentData.description} ${i + 1}`
          })
        }))
      );

      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
    });
  });
});