import { describe, it, expect } from 'bun:test';
import {
  hashPassword,
  verifyPassword,
  generateSalt,
  isValidPasswordHash,
  secureCompare
} from '../password.js';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(50);
      expect(hash.startsWith('$argon2id$')).toBe(true);
    });
    
    it('should generate different hashes for the same password', async () => {
      const password = 'TestPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
    
    it('should reject invalid password inputs', async () => {
      const invalidInputs = ['', null, undefined, 123];
      
      for (const input of invalidInputs) {
        await expect(hashPassword(input as any)).rejects.toThrow('Password must be a non-empty string');
      }
    });
    
    it('should handle special characters in passwords', async () => {
      const password = 'Test!@#$%^&*()_+{}|:<>?[]\\;\'",./`~';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash.startsWith('$argon2id$')).toBe(true);
    });
    
    it('should handle unicode characters in passwords', async () => {
      const password = 'שלום123עולם';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash.startsWith('$argon2id$')).toBe(true);
    });
  });
  
  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });
    
    it('should reject incorrect password', async () => {
      const password = 'TestPassword123';
      const wrongPassword = 'WrongPassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });
    
    it('should handle case sensitivity', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('testpassword123', hash);
      
      expect(isValid).toBe(false);
    });
    
    it('should reject invalid password inputs', async () => {
      const hash = await hashPassword('TestPassword123');
      const invalidInputs = ['', null, undefined, 123];
      
      for (const input of invalidInputs) {
        await expect(verifyPassword(input as any, hash)).rejects.toThrow('Password must be a non-empty string');
      }
    });
    
    it('should reject invalid hash inputs', async () => {
      const password = 'TestPassword123';
      const emptyHashes = ['', null, undefined, 123];
      
      // These should throw because they're not strings or are empty
      for (const hash of emptyHashes) {
        await expect(verifyPassword(password, hash as any)).rejects.toThrow('Hash must be a non-empty string');
      }
      
      // Invalid hash format should return false, not throw
      const invalidHash = 'invalid-hash';
      const result = await verifyPassword(password, invalidHash);
      expect(result).toBe(false);
    });
    
    it('should handle malformed hashes gracefully', async () => {
      const password = 'TestPassword123';
      const malformedHash = '$argon2id$malformed';
      const isValid = await verifyPassword(password, malformedHash);
      
      expect(isValid).toBe(false);
    });
    
    it('should verify passwords with special characters', async () => {
      const password = 'Test!@#$%^&*()_+';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });
    
    it('should verify passwords with unicode characters', async () => {
      const password = 'שלום123עולם';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });
  });
  
  describe('generateSalt', () => {
    it('should generate salt with default length', () => {
      const salt = generateSalt();
      
      expect(salt).toBeDefined();
      expect(typeof salt).toBe('string');
      expect(salt.length).toBe(64); // 32 bytes * 2 hex chars per byte
    });
    
    it('should generate salt with custom length', () => {
      const length = 16;
      const salt = generateSalt(length);
      
      expect(salt.length).toBe(length * 2); // hex encoding doubles the length
    });
    
    it('should generate different salts each time', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      
      expect(salt1).not.toBe(salt2);
    });
    
    it('should generate valid hex strings', () => {
      const salt = generateSalt();
      const hexRegex = /^[0-9a-f]+$/;
      
      expect(hexRegex.test(salt)).toBe(true);
    });
  });
  
  describe('isValidPasswordHash', () => {
    it('should validate correct Argon2id hashes', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      
      expect(isValidPasswordHash(hash)).toBe(true);
    });
    
    it('should reject invalid hash formats', () => {
      const invalidHashes = [
        '',
        'invalid-hash',
        '$bcrypt$invalid',
        '$argon2id$', // Too short
        null,
        undefined,
        123
      ];
      
      invalidHashes.forEach(hash => {
        expect(isValidPasswordHash(hash as any)).toBe(false);
      });
    });
    
    it('should validate hash length requirements', () => {
      const shortHash = '$argon2id$short';
      const validLengthHash = '$argon2id$' + 'a'.repeat(50);
      
      expect(isValidPasswordHash(shortHash)).toBe(false);
      expect(isValidPasswordHash(validLengthHash)).toBe(true);
    });
  });
  
  describe('secureCompare', () => {
    it('should return true for identical strings', () => {
      const str1 = 'identical';
      const str2 = 'identical';
      
      expect(secureCompare(str1, str2)).toBe(true);
    });
    
    it('should return false for different strings', () => {
      const str1 = 'different';
      const str2 = 'strings';
      
      expect(secureCompare(str1, str2)).toBe(false);
    });
    
    it('should return false for strings of different lengths', () => {
      const str1 = 'short';
      const str2 = 'longer string';
      
      expect(secureCompare(str1, str2)).toBe(false);
    });
    
    it('should handle empty strings', () => {
      expect(secureCompare('', '')).toBe(true);
      expect(secureCompare('', 'not empty')).toBe(false);
    });
    
    it('should be case sensitive', () => {
      const str1 = 'CaseSensitive';
      const str2 = 'casesensitive';
      
      expect(secureCompare(str1, str2)).toBe(false);
    });
    
    it('should handle special characters', () => {
      const str1 = '!@#$%^&*()';
      const str2 = '!@#$%^&*()';
      
      expect(secureCompare(str1, str2)).toBe(true);
    });
  });
  
  describe('Integration Tests', () => {
    it('should complete full password lifecycle', async () => {
      const password = 'ComplexPassword123!';
      
      // Hash the password
      const hash = await hashPassword(password);
      expect(isValidPasswordHash(hash)).toBe(true);
      
      // Verify correct password
      const isValidCorrect = await verifyPassword(password, hash);
      expect(isValidCorrect).toBe(true);
      
      // Verify incorrect password
      const isValidIncorrect = await verifyPassword('WrongPassword123!', hash);
      expect(isValidIncorrect).toBe(false);
    });
    
    it('should handle multiple concurrent operations', async () => {
      const passwords = ['Pass1', 'Pass2', 'Pass3', 'Pass4', 'Pass5'];
      
      // Hash all passwords concurrently
      const hashPromises = passwords.map(password => hashPassword(password));
      const hashes = await Promise.all(hashPromises);
      
      // Verify all passwords concurrently
      const verifyPromises = passwords.map((password, index) => 
        verifyPassword(password, hashes[index])
      );
      const results = await Promise.all(verifyPromises);
      
      // All verifications should succeed
      results.forEach(result => {
        expect(result).toBe(true);
      });
    });
  });
});