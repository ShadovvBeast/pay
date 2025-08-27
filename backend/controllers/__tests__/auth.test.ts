import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { cookie } from '@elysiajs/cookie';
import { authController } from '../auth.js';
import { userRepository } from '../../services/repository.js';
import { db } from '../../services/database.js';
import { CreateUserData } from '../../types/index.js';

// Test data
const validUserData: CreateUserData = {
  email: 'test-auth@example.com',
  password: 'TestPassword123',
  shopName: 'Test Shop',
  ownerName: 'Test Owner',
  merchantConfig: {
    merchantId: 'test-merchant-123',
    terminalId: 'test-terminal-456',
    successUrl: 'https://example.com/success',
    failureUrl: 'https://example.com/failure',
    notificationUrl: 'https://example.com/notify',
    currency: 'ILS',
    language: 'he'
  }
};

const validLoginData = {
  email: validUserData.email,
  password: validUserData.password
};

describe('Auth Controller Integration Tests', () => {
  let app: Elysia;

  beforeAll(async () => {
    // Create fresh Elysia app with auth controller
    app = new Elysia()
      .use(cookie())
      .use(authController);

    // Clean up test data
    await cleanupTestData();
  });

  afterAll(async () => {
    // Clean up test data after all tests
    await cleanupTestData();
  });

  async function cleanupTestData() {
    try {
      await db.query('DELETE FROM users WHERE email = $1', [validUserData.email]);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await app
        .handle(new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validUserData)
        }));

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(validUserData.email);
      expect(data.user.shopName).toBe(validUserData.shopName);
      expect(data.message).toBe('User registered successfully');

      // Check that password hash is not returned
      expect(data.user.passwordHash).toBeUndefined();
      expect(data.user.password).toBeUndefined();
    });

    it('should reject registration with invalid email', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };

      const response = await app
        .handle(new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidData)
        }));

      expect(response.status).toBe(422); // Elysia validation error
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials after registration', async () => {
      // First register a user
      await app
        .handle(new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validUserData)
        }));

      // Then login
      const response = await app
        .handle(new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validLoginData)
        }));

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(validLoginData.email);
      expect(data.message).toBe('Login successful');
    });

    it('should reject login with invalid credentials', async () => {
      const invalidLogin = { email: 'wrong@example.com', password: 'wrongpassword' };

      const response = await app
        .handle(new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidLogin)
        }));

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /auth/validate', () => {
    it('should reject request without token', async () => {
      const response = await app
        .handle(new Request('http://localhost/auth/validate', {
          method: 'GET'
        }));

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('NO_TOKEN');
    });
  });
});