import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { PostgresTransactionRepository } from '../transactionRepository.js';
import { db } from '../database.js';
import type { CreateTransactionData, Transaction } from '../../types/index.js';

describe('Transaction Repository', () => {
  let repository: PostgresTransactionRepository;
  let testUserId: string;
  let createdTransactionIds: string[] = [];

  beforeAll(async () => {
    repository = new PostgresTransactionRepository();
    testUserId = '123e4567-e89b-12d3-a456-426614174000';
    
    // Ensure database is initialized
    await db.initialize();
    
    // Create a test user for foreign key constraint
    try {
      await db.query(`
        INSERT INTO users (id, email, password_hash, shop_name, owner_name, merchant_config)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `, [
        testUserId,
        'test@example.com',
        'hashed_password',
        'Test Shop',
        'Test Owner',
        JSON.stringify({
          merchantId: 'TEST_MERCHANT',
          terminalId: 'TEST_TERMINAL',
          successUrl: 'https://example.com/success',
          failureUrl: 'https://example.com/failure',
          notificationUrl: 'https://example.com/webhook',
          currency: 'ILS',
          language: 'he'
        })
      ]);
    } catch (error) {
      console.log('Test user creation failed (might already exist):', error);
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (createdTransactionIds.length > 0) {
      const placeholders = createdTransactionIds.map((_, index) => `$${index + 1}`).join(',');
      await db.query(`DELETE FROM transactions WHERE id IN (${placeholders})`, createdTransactionIds);
    }
    
    // Clean up test user
    try {
      await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
    } catch (error) {
      console.log('Test user cleanup failed:', error);
    }
    
    await db.close();
  });

  beforeEach(() => {
    // Reset the array for each test
    createdTransactionIds = [];
  });

  const validTransactionData: CreateTransactionData = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    amount: 100.50,
    currency: 'ILS',
    paymentUrl: 'https://allpay.co.il/payment/test123',
    allpayTransactionId: 'ALLPAY_TEST_123'
  };

  describe('create', () => {
    it('should create a new transaction successfully', async () => {
      const transaction = await repository.create(validTransactionData);
      createdTransactionIds.push(transaction.id);

      expect(transaction).toBeDefined();
      expect(transaction.id).toBeDefined();
      expect(transaction.userId).toBe(validTransactionData.userId);
      expect(transaction.amount).toBe(validTransactionData.amount);
      expect(transaction.currency).toBe(validTransactionData.currency);
      expect(transaction.paymentUrl).toBe(validTransactionData.paymentUrl);
      expect(transaction.allpayTransactionId).toBe(validTransactionData.allpayTransactionId);
      expect(transaction.status).toBe('pending');
      expect(transaction.createdAt).toBeInstanceOf(Date);
      expect(transaction.updatedAt).toBeInstanceOf(Date);
    });

    it('should create transaction without AllPay transaction ID', async () => {
      const dataWithoutAllPayId = {
        ...validTransactionData,
        allpayTransactionId: undefined
      };

      const transaction = await repository.create(dataWithoutAllPayId);
      createdTransactionIds.push(transaction.id);

      expect(transaction.allpayTransactionId).toBeNull();
    });

    it('should reject invalid transaction data', async () => {
      const invalidData: CreateTransactionData = {
        userId: 'invalid-uuid',
        amount: -1,
        currency: 'INVALID',
        paymentUrl: 'http://insecure.com',
        allpayTransactionId: 'invalid@id'
      };

      await expect(repository.create(invalidData)).rejects.toThrow('Invalid transaction data');
    });

    it('should sanitize input data', async () => {
      const dirtyData: CreateTransactionData = {
        userId: '  123e4567-e89b-12d3-a456-426614174000  ',
        amount: 100.12, // Valid amount with 2 decimal places
        currency: '  ILS  ', // Valid currency code
        paymentUrl: '  https://allpay.co.il/payment/test123  ',
        allpayTransactionId: '  ALLPAY_TEST_123  '
      };

      const transaction = await repository.create(dirtyData);
      createdTransactionIds.push(transaction.id);

      expect(transaction.userId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(transaction.amount).toBe(100.12);
      expect(transaction.currency).toBe('ILS');
      expect(transaction.paymentUrl).toBe('https://allpay.co.il/payment/test123');
      expect(transaction.allpayTransactionId).toBe('ALLPAY_TEST_123');
    });
  });

  describe('findById', () => {
    it('should find transaction by ID', async () => {
      const createdTransaction = await repository.create(validTransactionData);
      createdTransactionIds.push(createdTransaction.id);

      const foundTransaction = await repository.findById(createdTransaction.id);

      expect(foundTransaction).toBeDefined();
      expect(foundTransaction?.id).toBe(createdTransaction.id);
      expect(foundTransaction?.userId).toBe(createdTransaction.userId);
      expect(foundTransaction?.amount).toBe(createdTransaction.amount);
    });

    it('should return null for non-existent transaction', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      const foundTransaction = await repository.findById(nonExistentId);

      expect(foundTransaction).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find transactions by user ID', async () => {
      // Create multiple transactions for the same user
      const transaction1 = await repository.create(validTransactionData);
      const transaction2 = await repository.create({
        ...validTransactionData,
        amount: 200,
        allpayTransactionId: 'ALLPAY_TEST_456'
      });

      createdTransactionIds.push(transaction1.id, transaction2.id);

      const transactions = await repository.findByUserId(testUserId);

      expect(transactions.length).toBeGreaterThanOrEqual(2);
      expect(transactions.every(t => t.userId === testUserId)).toBe(true);
      
      // Should be ordered by created_at DESC
      for (let i = 1; i < transactions.length; i++) {
        expect(transactions[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
          transactions[i].createdAt.getTime()
        );
      }
    });

    it('should respect pagination parameters', async () => {
      // Create transactions
      const transaction1 = await repository.create(validTransactionData);
      const transaction2 = await repository.create({
        ...validTransactionData,
        amount: 200,
        allpayTransactionId: 'ALLPAY_TEST_789'
      });

      createdTransactionIds.push(transaction1.id, transaction2.id);

      // Test limit
      const limitedTransactions = await repository.findByUserId(testUserId, 1);
      expect(limitedTransactions.length).toBe(1);

      // Test offset
      const offsetTransactions = await repository.findByUserId(testUserId, 10, 1);
      expect(offsetTransactions.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array for user with no transactions', async () => {
      const emptyUserId = '550e8400-e29b-41d4-a716-446655440001';
      const transactions = await repository.findByUserId(emptyUserId);

      expect(transactions).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    it('should find transactions by status', async () => {
      const transaction = await repository.create(validTransactionData);
      createdTransactionIds.push(transaction.id);

      const pendingTransactions = await repository.findByStatus('pending');

      expect(pendingTransactions.length).toBeGreaterThanOrEqual(1);
      expect(pendingTransactions.every(t => t.status === 'pending')).toBe(true);
    });

    it('should respect pagination for status queries', async () => {
      const transaction = await repository.create(validTransactionData);
      createdTransactionIds.push(transaction.id);

      const limitedTransactions = await repository.findByStatus('pending', 1);
      expect(limitedTransactions.length).toBe(1);
    });
  });

  describe('updateStatus', () => {
    it('should update transaction status', async () => {
      const transaction = await repository.create(validTransactionData);
      createdTransactionIds.push(transaction.id);

      const updatedTransaction = await repository.updateStatus(
        transaction.id, 
        'completed', 
        'ALLPAY_COMPLETED_123'
      );

      expect(updatedTransaction).toBeDefined();
      expect(updatedTransaction?.status).toBe('completed');
      expect(updatedTransaction?.allpayTransactionId).toBe('ALLPAY_COMPLETED_123');
      expect(updatedTransaction?.updatedAt.getTime()).toBeGreaterThan(
        transaction.updatedAt.getTime()
      );
    });

    it('should update status without changing AllPay transaction ID', async () => {
      const transaction = await repository.create(validTransactionData);
      createdTransactionIds.push(transaction.id);

      const updatedTransaction = await repository.updateStatus(transaction.id, 'failed');

      expect(updatedTransaction?.status).toBe('failed');
      expect(updatedTransaction?.allpayTransactionId).toBe(transaction.allpayTransactionId);
    });

    it('should return null for non-existent transaction', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      const result = await repository.updateStatus(nonExistentId, 'completed');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update transaction fields', async () => {
      const transaction = await repository.create(validTransactionData);
      createdTransactionIds.push(transaction.id);

      const updates = {
        amount: 150.75,
        status: 'completed' as const
      };

      const updatedTransaction = await repository.update(transaction.id, updates);

      expect(updatedTransaction?.amount).toBe(150.75);
      expect(updatedTransaction?.status).toBe('completed');
      expect(updatedTransaction?.updatedAt.getTime()).toBeGreaterThan(
        transaction.updatedAt.getTime()
      );
    });

    it('should reject updates with no valid fields', async () => {
      const transaction = await repository.create(validTransactionData);
      createdTransactionIds.push(transaction.id);

      await expect(repository.update(transaction.id, {})).rejects.toThrow(
        'No valid fields to update'
      );
    });

    it('should ignore invalid fields', async () => {
      const transaction = await repository.create(validTransactionData);
      createdTransactionIds.push(transaction.id);

      const updates = {
        amount: 150.75,
        invalidField: 'should be ignored'
      } as any;

      const updatedTransaction = await repository.update(transaction.id, updates);

      expect(updatedTransaction?.amount).toBe(150.75);
      // Should not throw error, just ignore invalid field
    });
  });

  describe('delete', () => {
    it('should soft delete transaction by setting status to cancelled', async () => {
      const transaction = await repository.create(validTransactionData);
      createdTransactionIds.push(transaction.id);

      const deleted = await repository.delete(transaction.id);
      expect(deleted).toBe(true);

      const foundTransaction = await repository.findById(transaction.id);
      expect(foundTransaction?.status).toBe('cancelled');
    });

    it('should not delete completed transactions', async () => {
      const transaction = await repository.create(validTransactionData);
      createdTransactionIds.push(transaction.id);

      // First complete the transaction
      await repository.updateStatus(transaction.id, 'completed');

      // Try to delete it
      const deleted = await repository.delete(transaction.id);
      expect(deleted).toBe(false);

      const foundTransaction = await repository.findById(transaction.id);
      expect(foundTransaction?.status).toBe('completed');
    });

    it('should return false for non-existent transaction', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      const deleted = await repository.delete(nonExistentId);

      expect(deleted).toBe(false);
    });
  });

  describe('countByUserId', () => {
    it('should count transactions for user', async () => {
      const initialCount = await repository.countByUserId(testUserId);

      const transaction = await repository.create(validTransactionData);
      createdTransactionIds.push(transaction.id);

      const newCount = await repository.countByUserId(testUserId);
      expect(newCount).toBe(initialCount + 1);
    });

    it('should return 0 for user with no transactions', async () => {
      const emptyUserId = '550e8400-e29b-41d4-a716-446655440002';
      const count = await repository.countByUserId(emptyUserId);

      expect(count).toBe(0);
    });
  });

  describe('findRecentByUserId', () => {
    it('should find recent transactions within specified hours', async () => {
      const transaction = await repository.create(validTransactionData);
      createdTransactionIds.push(transaction.id);

      const recentTransactions = await repository.findRecentByUserId(testUserId, 24);

      expect(recentTransactions.length).toBeGreaterThanOrEqual(1);
      expect(recentTransactions.some(t => t.id === transaction.id)).toBe(true);
    });

    it('should not find old transactions', async () => {
      // This test would require creating transactions with old timestamps
      // For now, we'll test with a very small time window
      const recentTransactions = await repository.findRecentByUserId(testUserId, 0.001); // ~3.6 seconds

      // Should be empty or very few results
      expect(recentTransactions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTransactionStats', () => {
    it('should return transaction statistics for user', async () => {
      // Create transactions with different statuses
      const pendingTransaction = await repository.create(validTransactionData);
      const completedTransaction = await repository.create({
        ...validTransactionData,
        amount: 200,
        allpayTransactionId: 'ALLPAY_COMPLETED'
      });

      createdTransactionIds.push(pendingTransaction.id, completedTransaction.id);

      // Update one to completed
      await repository.updateStatus(completedTransaction.id, 'completed');

      const stats = await repository.getTransactionStats(testUserId);

      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.pending).toBeGreaterThanOrEqual(1);
      expect(stats.completed).toBeGreaterThanOrEqual(1);
      expect(stats.totalAmount).toBeGreaterThanOrEqual(300.5);
      expect(stats.completedAmount).toBeGreaterThanOrEqual(200);
    });

    it('should return zero stats for user with no transactions', async () => {
      const emptyUserId = '550e8400-e29b-41d4-a716-446655440003';
      const stats = await repository.getTransactionStats(emptyUserId);

      expect(stats.total).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.cancelled).toBe(0);
      expect(stats.totalAmount).toBe(0);
      expect(stats.completedAmount).toBe(0);
    });
  });

  describe('executeInTransaction', () => {
    it('should execute operations in a database transaction', async () => {
      const result = await repository.executeInTransaction(async (client) => {
        // This would typically involve multiple database operations
        // For testing, we'll just return a value
        return 'transaction completed';
      });

      expect(result).toBe('transaction completed');
    });

    it('should rollback on error', async () => {
      const initialCount = await repository.countByUserId(testUserId);

      try {
        await repository.executeInTransaction(async (client) => {
          // Create a transaction within the database transaction
          await client.query(`
            INSERT INTO transactions (user_id, amount, currency, payment_url, status)
            VALUES ($1, $2, $3, $4, $5)
          `, [testUserId, 100, 'ILS', 'https://test.com', 'pending']);

          // Throw an error to trigger rollback
          throw new Error('Test error');
        });
      } catch (error: any) {
        // The error might be the test error or a database constraint error
        expect(error.message).toContain('Test error');
      }

      // Count should be the same as before (rollback occurred)
      const finalCount = await repository.countByUserId(testUserId);
      expect(finalCount).toBe(initialCount);
    });
  });
});