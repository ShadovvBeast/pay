import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { UserRepository, TransactionRepository } from '../repository';
import { db } from '../database';
import { CreateUserData, CreateTransactionData, MerchantConfig } from '../../types';
import bcrypt from 'bcryptjs';

describe('Repository Services', () => {
  let userRepo: UserRepository;
  let transactionRepo: TransactionRepository;

  beforeAll(async () => {
    // Override config for testing
    process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
    process.env.DB_PORT = process.env.TEST_DB_PORT || '5432';
    process.env.DB_NAME = process.env.TEST_DB_NAME || 'sb0_pay_test';
    process.env.DB_USER = process.env.TEST_DB_USER || 'postgres';
    process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'password';

    await db.initialize();
    userRepo = new UserRepository();
    transactionRepo = new TransactionRepository();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await db.query('TRUNCATE TABLE transactions, users RESTART IDENTITY CASCADE');
  });

  describe('UserRepository', () => {
    const mockMerchantConfig: MerchantConfig = {
      merchantId: 'test_merchant_123',
      terminalId: 'test_terminal_456',
      successUrl: 'https://example.com/success',
      failureUrl: 'https://example.com/failure',
      notificationUrl: 'https://example.com/webhook',
      currency: 'ILS',
      language: 'he'
    };

    const mockUserData: CreateUserData = {
      email: 'test@example.com',
      password: 'hashedpassword123',
      shopName: 'Test Shop',
      ownerName: 'Test Owner',
      merchantConfig: mockMerchantConfig
    };

    it('should create a new user', async () => {
      const user = await userRepo.create(mockUserData);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(mockUserData.email);
      expect(user.shopName).toBe(mockUserData.shopName);
      expect(user.ownerName).toBe(mockUserData.ownerName);
      expect(user.merchantConfig).toEqual(mockMerchantConfig);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should find user by email', async () => {
      const createdUser = await userRepo.create(mockUserData);
      const foundUser = await userRepo.findByEmail(mockUserData.email);

      expect(foundUser).not.toBeNull();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe(mockUserData.email);
      expect(foundUser?.merchantConfig).toEqual(mockMerchantConfig);
    });

    it('should return null for non-existent email', async () => {
      const user = await userRepo.findByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });

    it('should find user by ID', async () => {
      const createdUser = await userRepo.create(mockUserData);
      const foundUser = await userRepo.findById(createdUser.id);

      expect(foundUser).not.toBeNull();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe(mockUserData.email);
    });

    it('should return null for non-existent ID', async () => {
      const user = await userRepo.findById('550e8400-e29b-41d4-a716-446655440000');
      expect(user).toBeNull();
    });

    it('should update merchant configuration', async () => {
      const createdUser = await userRepo.create(mockUserData);
      
      const newMerchantConfig: MerchantConfig = {
        ...mockMerchantConfig,
        merchantId: 'updated_merchant_456',
        currency: 'USD'
      };

      const updatedUser = await userRepo.updateMerchantConfig(createdUser.id, newMerchantConfig);

      expect(updatedUser).not.toBeNull();
      expect(updatedUser?.merchantConfig.merchantId).toBe('updated_merchant_456');
      expect(updatedUser?.merchantConfig.currency).toBe('USD');
      expect(updatedUser?.updatedAt.getTime()).toBeGreaterThan(createdUser.updatedAt.getTime());
    });

    it('should delete user', async () => {
      const createdUser = await userRepo.create(mockUserData);
      const deleted = await userRepo.delete(createdUser.id);

      expect(deleted).toBe(true);

      const foundUser = await userRepo.findById(createdUser.id);
      expect(foundUser).toBeNull();
    });

    it('should handle duplicate email constraint', async () => {
      await userRepo.create(mockUserData);

      try {
        await userRepo.create(mockUserData);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('duplicate key value');
      }
    });
  });

  describe('TransactionRepository', () => {
    let testUserId: string;

    beforeEach(async () => {
      // Create a test user for transaction tests
      const mockUserData: CreateUserData = {
        email: 'transaction-test@example.com',
        password: 'hashedpassword123',
        shopName: 'Transaction Test Shop',
        ownerName: 'Transaction Test Owner',
        merchantConfig: {
          merchantId: 'test_merchant_123',
          terminalId: 'test_terminal_456',
          successUrl: 'https://example.com/success',
          failureUrl: 'https://example.com/failure',
          notificationUrl: 'https://example.com/webhook',
          currency: 'ILS',
          language: 'he'
        }
      };

      const user = await userRepo.create(mockUserData);
      testUserId = user.id;
    });

    const mockTransactionData: CreateTransactionData = {
      userId: '', // Will be set in beforeEach
      amount: 100.50,
      currency: 'ILS',
      paymentUrl: 'https://allpay.co.il/payment/abc123',
      allpayTransactionId: 'allpay_txn_123'
    };

    it('should create a new transaction', async () => {
      const transactionData = { ...mockTransactionData, userId: testUserId };
      const transaction = await transactionRepo.create(transactionData);

      expect(transaction.id).toBeDefined();
      expect(transaction.userId).toBe(testUserId);
      expect(transaction.amount).toBe(100.50);
      expect(transaction.currency).toBe('ILS');
      expect(transaction.paymentUrl).toBe(transactionData.paymentUrl);
      expect(transaction.allpayTransactionId).toBe(transactionData.allpayTransactionId);
      expect(transaction.status).toBe('pending');
      expect(transaction.createdAt).toBeDefined();
      expect(transaction.updatedAt).toBeDefined();
    });

    it('should find transaction by ID', async () => {
      const transactionData = { ...mockTransactionData, userId: testUserId };
      const createdTransaction = await transactionRepo.create(transactionData);
      const foundTransaction = await transactionRepo.findById(createdTransaction.id);

      expect(foundTransaction).not.toBeNull();
      expect(foundTransaction?.id).toBe(createdTransaction.id);
      expect(foundTransaction?.amount).toBe(100.50);
    });

    it('should find transaction by AllPay ID', async () => {
      const transactionData = { ...mockTransactionData, userId: testUserId };
      const createdTransaction = await transactionRepo.create(transactionData);
      const foundTransaction = await transactionRepo.findByAllPayId('allpay_txn_123');

      expect(foundTransaction).not.toBeNull();
      expect(foundTransaction?.id).toBe(createdTransaction.id);
      expect(foundTransaction?.allpayTransactionId).toBe('allpay_txn_123');
    });

    it('should update transaction status', async () => {
      const transactionData = { ...mockTransactionData, userId: testUserId };
      const createdTransaction = await transactionRepo.create(transactionData);
      
      const updatedTransaction = await transactionRepo.updateStatus(createdTransaction.id, 'completed');

      expect(updatedTransaction).not.toBeNull();
      expect(updatedTransaction?.status).toBe('completed');
      expect(updatedTransaction?.updatedAt.getTime()).toBeGreaterThan(createdTransaction.updatedAt.getTime());
    });

    it('should update AllPay transaction ID', async () => {
      const transactionData = { ...mockTransactionData, userId: testUserId, allpayTransactionId: undefined };
      const createdTransaction = await transactionRepo.create(transactionData);
      
      const updatedTransaction = await transactionRepo.updateAllPayId(createdTransaction.id, 'new_allpay_id_456');

      expect(updatedTransaction).not.toBeNull();
      expect(updatedTransaction?.allpayTransactionId).toBe('new_allpay_id_456');
    });

    it('should find transactions by user ID with pagination', async () => {
      const transactionData = { ...mockTransactionData, userId: testUserId };
      
      // Create multiple transactions
      await transactionRepo.create({ ...transactionData, amount: 100 });
      await transactionRepo.create({ ...transactionData, amount: 200 });
      await transactionRepo.create({ ...transactionData, amount: 300 });

      const transactions = await transactionRepo.findByUserId(testUserId, 2, 0);
      expect(transactions).toHaveLength(2);
      expect(transactions[0].amount).toBe(300); // Most recent first
      expect(transactions[1].amount).toBe(200);

      const nextPage = await transactionRepo.findByUserId(testUserId, 2, 2);
      expect(nextPage).toHaveLength(1);
      expect(nextPage[0].amount).toBe(100);
    });

    it('should count transactions by user ID', async () => {
      const transactionData = { ...mockTransactionData, userId: testUserId };
      
      await transactionRepo.create({ ...transactionData, amount: 100 });
      await transactionRepo.create({ ...transactionData, amount: 200 });

      const count = await transactionRepo.countByUserId(testUserId);
      expect(count).toBe(2);
    });

    it('should find transactions by status', async () => {
      const transactionData = { ...mockTransactionData, userId: testUserId };
      
      const transaction1 = await transactionRepo.create({ ...transactionData, amount: 100 });
      const transaction2 = await transactionRepo.create({ ...transactionData, amount: 200 });
      
      await transactionRepo.updateStatus(transaction1.id, 'completed');

      const pendingTransactions = await transactionRepo.findByStatus('pending');
      const completedTransactions = await transactionRepo.findByStatus('completed');

      expect(pendingTransactions).toHaveLength(1);
      expect(pendingTransactions[0].id).toBe(transaction2.id);
      
      expect(completedTransactions).toHaveLength(1);
      expect(completedTransactions[0].id).toBe(transaction1.id);
    });

    it('should delete transaction', async () => {
      const transactionData = { ...mockTransactionData, userId: testUserId };
      const createdTransaction = await transactionRepo.create(transactionData);
      
      const deleted = await transactionRepo.delete(createdTransaction.id);
      expect(deleted).toBe(true);

      const foundTransaction = await transactionRepo.findById(createdTransaction.id);
      expect(foundTransaction).toBeNull();
    });

    it('should enforce foreign key constraint', async () => {
      const transactionData = { 
        ...mockTransactionData, 
        userId: '550e8400-e29b-41d4-a716-446655440000' // Non-existent user ID
      };

      try {
        await transactionRepo.create(transactionData);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('violates foreign key constraint');
      }
    });

    it('should enforce positive amount constraint', async () => {
      const transactionData = { ...mockTransactionData, userId: testUserId, amount: -10 };

      try {
        await transactionRepo.create(transactionData);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('violates check constraint');
      }
    });
  });
});