import { describe, it, expect } from 'bun:test';
import {
  validateAmount,
  validateCurrency,
  validatePaymentUrl,
  validateTransactionStatus,
  validateAllPayTransactionId,
  validateUserId,
  validateCreateTransactionData,
  validateTransaction,
  sanitizeCreateTransactionData,
  isValidStatusTransition,
  getValidNextStatuses,
  isTransactionFinal,
  formatTransactionAmount
} from '../transaction.js';
import type { CreateTransactionData, Transaction } from '../../types/index.js';

describe('Transaction Model Validation', () => {
  describe('validateAmount', () => {
    it('should validate correct amounts', () => {
      const validAmounts = [0.01, 1, 10.50, 100, 999.99];
      
      validAmounts.forEach(amount => {
        const result = validateAmount(amount);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
    
    it('should reject invalid amounts', () => {
      const invalidAmounts = [
        { amount: 0, expectedError: 'Amount must be greater than zero' },
        { amount: -1, expectedError: 'Amount must be greater than zero' },
        { amount: 1000001, expectedError: 'Amount exceeds maximum allowed value' },
        { amount: 10.123, expectedError: 'Amount cannot have more than 2 decimal places' },
        { amount: NaN, expectedError: 'Amount must be a valid number' },
        { amount: Infinity, expectedError: 'Amount must be a valid number' },
        { amount: 'invalid' as any, expectedError: 'Amount must be a number' }
      ];
      
      invalidAmounts.forEach(({ amount, expectedError }) => {
        const result = validateAmount(amount);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(expectedError);
      });
    });
    
    it('should handle edge cases', () => {
      expect(validateAmount(0.001).isValid).toBe(false); // Too many decimal places
      expect(validateAmount(999999.99).isValid).toBe(true); // Just under max
      expect(validateAmount(1000000).isValid).toBe(true); // Exactly at max
      expect(validateAmount(1000000.01).isValid).toBe(false); // Just over max
    });
  });
  
  describe('validateCurrency', () => {
    it('should validate correct currency codes', () => {
      const validCurrencies = ['ILS', 'USD', 'EUR', 'GBP', 'JPY'];
      
      validCurrencies.forEach(currency => {
        expect(validateCurrency(currency)).toBe(true);
      });
    });
    
    it('should reject invalid currency codes', () => {
      const invalidCurrencies = [
        '', 'IL', 'ILSS', 'ils', 'US', '123', null, undefined, 123
      ];
      
      invalidCurrencies.forEach(currency => {
        expect(validateCurrency(currency as any)).toBe(false);
      });
    });
    
    it('should handle whitespace', () => {
      expect(validateCurrency(' ILS ')).toBe(true);
      expect(validateCurrency('I LS')).toBe(false);
    });
  });
  
  describe('validatePaymentUrl', () => {
    it('should validate correct HTTPS URLs', () => {
      const validUrls = [
        'https://example.com/payment',
        'https://allpay.co.il/payment/123',
        'https://secure-payment.com/pay?id=123&amount=100'
      ];
      
      validUrls.forEach(url => {
        expect(validatePaymentUrl(url)).toBe(true);
      });
    });
    
    it('should reject invalid URLs', () => {
      const invalidUrls = [
        '',
        'http://example.com/payment', // HTTP not allowed
        'ftp://example.com/payment',
        'invalid-url',
        'https://',
        null,
        undefined,
        123
      ];
      
      invalidUrls.forEach(url => {
        expect(validatePaymentUrl(url as any)).toBe(false);
      });
    });
  });
  
  describe('validateTransactionStatus', () => {
    it('should validate correct statuses', () => {
      const validStatuses = ['pending', 'completed', 'failed', 'cancelled'];
      
      validStatuses.forEach(status => {
        expect(validateTransactionStatus(status)).toBe(true);
      });
    });
    
    it('should reject invalid statuses', () => {
      const invalidStatuses = ['', 'processing', 'success', 'error', null, undefined, 123];
      
      invalidStatuses.forEach(status => {
        expect(validateTransactionStatus(status as any)).toBe(false);
      });
    });
  });
  
  describe('validateAllPayTransactionId', () => {
    it('should validate correct AllPay transaction IDs', () => {
      const validIds = [
        'ABC123',
        'transaction_123',
        'pay-456',
        'TXN123456789',
        'a1b2c3'
      ];
      
      validIds.forEach(id => {
        expect(validateAllPayTransactionId(id)).toBe(true);
      });
    });
    
    it('should reject invalid AllPay transaction IDs', () => {
      const invalidIds = [
        '',
        'AB', // Too short
        'A'.repeat(101), // Too long
        'invalid@id',
        'id with spaces',
        'id#with$special',
        null,
        undefined,
        123
      ];
      
      invalidIds.forEach(id => {
        expect(validateAllPayTransactionId(id as any)).toBe(false);
      });
    });
  });
  
  describe('validateUserId', () => {
    it('should validate correct UUID formats', () => {
      const validUuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      ];
      
      validUuids.forEach(uuid => {
        expect(validateUserId(uuid)).toBe(true);
      });
    });
    
    it('should reject invalid UUID formats', () => {
      const invalidUuids = [
        '',
        '123e4567-e89b-12d3-a456', // Too short
        '123e4567-e89b-12d3-a456-426614174000-extra', // Too long
        '123e4567-e89b-12d3-a456-42661417400g', // Invalid character
        'not-a-uuid',
        null,
        undefined,
        123
      ];
      
      invalidUuids.forEach(uuid => {
        expect(validateUserId(uuid as any)).toBe(false);
      });
    });
  });
  
  describe('validateCreateTransactionData', () => {
    const validTransactionData: CreateTransactionData = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      amount: 100.50,
      currency: 'ILS',
      paymentUrl: 'https://allpay.co.il/payment/123',
      allpayTransactionId: 'TXN123456'
    };
    
    it('should validate correct transaction data', () => {
      const result = validateCreateTransactionData(validTransactionData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should validate transaction data without optional AllPay ID', () => {
      const dataWithoutAllPayId = {
        ...validTransactionData,
        allpayTransactionId: undefined
      };
      
      const result = validateCreateTransactionData(dataWithoutAllPayId);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should aggregate all validation errors', () => {
      const invalidData: CreateTransactionData = {
        userId: 'invalid-uuid',
        amount: -1,
        currency: 'invalid',
        paymentUrl: 'http://insecure.com',
        allpayTransactionId: 'invalid@id'
      };
      
      const result = validateCreateTransactionData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });
  });
  
  describe('validateTransaction', () => {
    const validTransaction: Transaction = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      amount: 100.50,
      currency: 'ILS',
      paymentUrl: 'https://allpay.co.il/payment/123',
      allpayTransactionId: 'TXN123456',
      status: 'pending',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z')
    };
    
    it('should validate correct transaction', () => {
      const result = validateTransaction(validTransaction);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should validate date logic', () => {
      const invalidTransaction = {
        ...validTransaction,
        createdAt: new Date('2024-01-01T12:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z') // Updated before created
      };
      
      const result = validateTransaction(invalidTransaction);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Updated date cannot be before created date');
    });
    
    it('should validate date objects', () => {
      const invalidTransaction = {
        ...validTransaction,
        createdAt: 'invalid-date' as any,
        updatedAt: new Date('invalid') as any
      };
      
      const result = validateTransaction(invalidTransaction);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid created date');
      expect(result.errors).toContain('Invalid updated date');
    });
  });
  
  describe('sanitizeCreateTransactionData', () => {
    it('should sanitize and normalize transaction data', () => {
      const dirtyData: CreateTransactionData = {
        userId: '  123e4567-e89b-12d3-a456-426614174000  ',
        amount: 100.123, // Will be rounded
        currency: '  ils  ',
        paymentUrl: '  https://allpay.co.il/payment/123  ',
        allpayTransactionId: '  TXN123456  '
      };
      
      const sanitized = sanitizeCreateTransactionData(dirtyData);
      
      expect(sanitized.userId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(sanitized.amount).toBe(100.12); // Rounded to 2 decimal places
      expect(sanitized.currency).toBe('ILS');
      expect(sanitized.paymentUrl).toBe('https://allpay.co.il/payment/123');
      expect(sanitized.allpayTransactionId).toBe('TXN123456');
    });
    
    it('should handle undefined AllPay transaction ID', () => {
      const data: CreateTransactionData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 100,
        currency: 'ILS',
        paymentUrl: 'https://allpay.co.il/payment/123'
      };
      
      const sanitized = sanitizeCreateTransactionData(data);
      expect(sanitized.allpayTransactionId).toBeUndefined();
    });
  });
  
  describe('Status Transition Logic', () => {
    describe('isValidStatusTransition', () => {
      it('should allow valid transitions from pending', () => {
        expect(isValidStatusTransition('pending', 'completed')).toBe(true);
        expect(isValidStatusTransition('pending', 'failed')).toBe(true);
        expect(isValidStatusTransition('pending', 'cancelled')).toBe(true);
      });
      
      it('should not allow transitions from completed', () => {
        expect(isValidStatusTransition('completed', 'pending')).toBe(false);
        expect(isValidStatusTransition('completed', 'failed')).toBe(false);
        expect(isValidStatusTransition('completed', 'cancelled')).toBe(false);
      });
      
      it('should allow retry from failed', () => {
        expect(isValidStatusTransition('failed', 'pending')).toBe(true);
        expect(isValidStatusTransition('failed', 'completed')).toBe(false);
        expect(isValidStatusTransition('failed', 'cancelled')).toBe(false);
      });
      
      it('should not allow transitions from cancelled', () => {
        expect(isValidStatusTransition('cancelled', 'pending')).toBe(false);
        expect(isValidStatusTransition('cancelled', 'completed')).toBe(false);
        expect(isValidStatusTransition('cancelled', 'failed')).toBe(false);
      });
    });
    
    describe('getValidNextStatuses', () => {
      it('should return correct next statuses for pending', () => {
        const nextStatuses = getValidNextStatuses('pending');
        expect(nextStatuses).toEqual(['completed', 'failed', 'cancelled']);
      });
      
      it('should return empty array for completed', () => {
        const nextStatuses = getValidNextStatuses('completed');
        expect(nextStatuses).toEqual([]);
      });
      
      it('should return pending for failed', () => {
        const nextStatuses = getValidNextStatuses('failed');
        expect(nextStatuses).toEqual(['pending']);
      });
      
      it('should return empty array for cancelled', () => {
        const nextStatuses = getValidNextStatuses('cancelled');
        expect(nextStatuses).toEqual([]);
      });
    });
    
    describe('isTransactionFinal', () => {
      it('should identify final statuses', () => {
        expect(isTransactionFinal('completed')).toBe(true);
        expect(isTransactionFinal('cancelled')).toBe(true);
        expect(isTransactionFinal('pending')).toBe(false);
        expect(isTransactionFinal('failed')).toBe(false);
      });
    });
  });
  
  describe('formatTransactionAmount', () => {
    it('should format amounts with currency symbols', () => {
      expect(formatTransactionAmount(100, 'ILS')).toBe('₪100.00');
      expect(formatTransactionAmount(50.5, 'USD')).toBe('$50.50');
      expect(formatTransactionAmount(25.99, 'EUR')).toBe('€25.99');
      expect(formatTransactionAmount(10, 'GBP')).toBe('£10.00');
    });
    
    it('should handle unknown currencies', () => {
      expect(formatTransactionAmount(100, 'XYZ')).toBe('XYZ100.00');
    });
    
    it('should handle case insensitive currencies', () => {
      expect(formatTransactionAmount(100, 'ils')).toBe('₪100.00');
      expect(formatTransactionAmount(100, 'usd')).toBe('$100.00');
    });
    
    it('should format decimal places correctly', () => {
      expect(formatTransactionAmount(100, 'ILS')).toBe('₪100.00');
      expect(formatTransactionAmount(100.1, 'ILS')).toBe('₪100.10');
      expect(formatTransactionAmount(100.123, 'ILS')).toBe('₪100.12');
    });
  });
});