import { describe, it, expect } from 'bun:test';
import {
  validateEmail,
  validatePasswordStrength,
  validateMerchantConfig,
  validateUserData,
  sanitizeUserData
} from '../user.js';
import type { CreateUserData, MerchantConfig } from '../../types/index.js';

describe('User Model Validation', () => {
  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.il',
        'user+tag@example.org',
        'user123@test-domain.com'
      ];
      
      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });
    
    it('should reject invalid email formats', () => {
      const invalidEmails = [
        '',
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user..name@domain.com',
        'user@domain..com',
        null as any,
        undefined as any,
        123 as any
      ];
      
      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
    
    it('should handle whitespace in emails', () => {
      expect(validateEmail(' test@example.com ')).toBe(true);
      expect(validateEmail('test @example.com')).toBe(false);
    });
  });
  
  describe('validatePasswordStrength', () => {
    it('should validate strong passwords', () => {
      const strongPasswords = [
        'StrongPass123',
        'MySecure1Password',
        'Complex9Pass!'
      ];
      
      strongPasswords.forEach(password => {
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
    
    it('should reject weak passwords', () => {
      const weakPasswords = [
        { password: '', expectedErrors: ['Password is required'] },
        { password: 'short', expectedErrors: ['Password must be at least 8 characters long'] },
        { password: 'nouppercase123', expectedErrors: ['Password must contain at least one uppercase letter'] },
        { password: 'NOLOWERCASE123', expectedErrors: ['Password must contain at least one lowercase letter'] },
        { password: 'NoNumbers', expectedErrors: ['Password must contain at least one number'] },
        { password: 'password', expectedErrors: ['Password is too common, please choose a stronger password'] }
      ];
      
      weakPasswords.forEach(({ password, expectedErrors }) => {
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(false);
        expectedErrors.forEach(error => {
          expect(result.errors).toContain(error);
        });
      });
    });
    
    it('should handle multiple validation errors', () => {
      const result = validatePasswordStrength('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
    
    it('should handle null and undefined passwords', () => {
      expect(validatePasswordStrength(null as any).isValid).toBe(false);
      expect(validatePasswordStrength(undefined as any).isValid).toBe(false);
    });
  });
  
  describe('validateMerchantConfig', () => {
    const validMerchantConfig: MerchantConfig = {
      merchantId: 'MERCHANT123',
      terminalId: 'TERMINAL456',
      successUrl: 'https://example.com/success',
      failureUrl: 'https://example.com/failure',
      notificationUrl: 'https://example.com/webhook',
      currency: 'ILS',
      language: 'he'
    };
    
    it('should validate correct merchant configuration', () => {
      const result = validateMerchantConfig(validMerchantConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject missing required fields', () => {
      const invalidConfig = {
        ...validMerchantConfig,
        merchantId: '',
        terminalId: ''
      };
      
      const result = validateMerchantConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Merchant ID is required');
      expect(result.errors).toContain('Terminal ID is required');
    });
    
    it('should validate URL formats', () => {
      const invalidConfig = {
        ...validMerchantConfig,
        successUrl: 'invalid-url',
        failureUrl: 'not-a-url',
        notificationUrl: ''
      };
      
      const result = validateMerchantConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Success URL must be a valid URL');
      expect(result.errors).toContain('Failure URL must be a valid URL');
      expect(result.errors).toContain('Notification URL is required');
    });
    
    it('should validate currency format', () => {
      const invalidConfig = {
        ...validMerchantConfig,
        currency: 'invalid'
      };
      
      const result = validateMerchantConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Currency must be a valid 3-letter ISO code (e.g., ILS, USD)');
    });
    
    it('should validate language format', () => {
      const invalidConfig = {
        ...validMerchantConfig,
        language: 'invalid'
      };
      
      const result = validateMerchantConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Language must be a valid 2-letter ISO code (e.g., he, en)');
    });
    
    it('should handle null merchant config', () => {
      const result = validateMerchantConfig(null as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Merchant configuration is required');
    });
  });
  
  describe('validateUserData', () => {
    const validUserData: CreateUserData = {
      email: 'test@example.com',
      password: 'StrongPass123',
      shopName: 'Test Shop',
      ownerName: 'John Doe',
      merchantConfig: {
        merchantId: 'MERCHANT123',
        terminalId: 'TERMINAL456',
        successUrl: 'https://example.com/success',
        failureUrl: 'https://example.com/failure',
        notificationUrl: 'https://example.com/webhook',
        currency: 'ILS',
        language: 'he'
      }
    };
    
    it('should validate complete user data', () => {
      const result = validateUserData(validUserData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should validate shop name requirements', () => {
      const invalidData = {
        ...validUserData,
        shopName: 'A' // Too short
      };
      
      const result = validateUserData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Shop name must be at least 2 characters long');
    });
    
    it('should validate owner name requirements', () => {
      const invalidData = {
        ...validUserData,
        ownerName: '' // Empty
      };
      
      const result = validateUserData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Owner name is required');
    });
    
    it('should validate maximum length constraints', () => {
      const longString = 'A'.repeat(101);
      const invalidData = {
        ...validUserData,
        shopName: longString,
        ownerName: longString
      };
      
      const result = validateUserData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Shop name must be less than 100 characters');
      expect(result.errors).toContain('Owner name must be less than 100 characters');
    });
    
    it('should aggregate all validation errors', () => {
      const invalidData: CreateUserData = {
        email: 'invalid-email',
        password: 'weak',
        shopName: '',
        ownerName: '',
        merchantConfig: {
          merchantId: '',
          terminalId: '',
          successUrl: 'invalid-url',
          failureUrl: 'invalid-url',
          notificationUrl: 'invalid-url',
          currency: 'invalid',
          language: 'invalid'
        }
      };
      
      const result = validateUserData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(5);
    });
  });
  
  describe('sanitizeUserData', () => {
    it('should sanitize and normalize user data', () => {
      const dirtyData: CreateUserData = {
        email: '  TEST@EXAMPLE.COM  ',
        password: 'StrongPass123',
        shopName: '  Test Shop  ',
        ownerName: '  John Doe  ',
        merchantConfig: {
          merchantId: '  MERCHANT123  ',
          terminalId: '  TERMINAL456  ',
          successUrl: '  https://example.com/success  ',
          failureUrl: '  https://example.com/failure  ',
          notificationUrl: '  https://example.com/webhook  ',
          currency: '  ils  ',
          language: '  HE  '
        }
      };
      
      const sanitized = sanitizeUserData(dirtyData);
      
      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.password).toBe('StrongPass123'); // Password should not be trimmed
      expect(sanitized.shopName).toBe('Test Shop');
      expect(sanitized.ownerName).toBe('John Doe');
      expect(sanitized.merchantConfig.merchantId).toBe('MERCHANT123');
      expect(sanitized.merchantConfig.currency).toBe('ILS');
      expect(sanitized.merchantConfig.language).toBe('he');
    });
    
    it('should preserve password spaces', () => {
      const dataWithSpacedPassword: CreateUserData = {
        email: 'test@example.com',
        password: ' Strong Pass 123 ',
        shopName: 'Test Shop',
        ownerName: 'John Doe',
        merchantConfig: {
          merchantId: 'MERCHANT123',
          terminalId: 'TERMINAL456',
          successUrl: 'https://example.com/success',
          failureUrl: 'https://example.com/failure',
          notificationUrl: 'https://example.com/webhook',
          currency: 'ILS',
          language: 'he'
        }
      };
      
      const sanitized = sanitizeUserData(dataWithSpacedPassword);
      expect(sanitized.password).toBe(' Strong Pass 123 ');
    });
  });
});