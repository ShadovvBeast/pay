import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { cookie } from '@elysiajs/cookie';
import { jwt } from '@elysiajs/jwt';
import { authController } from '../auth';
import { requireAuth } from '../../middleware/auth';
import { db } from '../../services/database';
import { userRepository } from '../../services/repository';
import { hashPassword } from '../../utils/password';
import type { User, CreateUserData } from '../../types';

// Test configuration
const TEST_JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Test data
const testUserData: CreateUserData = {
  email: 'debug-test@example.com',
  password: 'TestPassword123!',
  shopName: 'Debug Test Shop',
  ownerName: 'Debug Test Owner',
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

describe('Payment Debug Tests', () => {
  beforeAll(async () => {
    // Initialize test database
    await db.initialize();
    
    // Create test app
    testApp = new Elysia()
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
      .use(requireAuth)
      .get('/test-auth', async ({ user, set }) => {
        return {
          success: true,
          user: {
            userId: user.userId,
            email: user.email
          }
        };
      });
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM users WHERE email LIKE $1', ['%debug-test%']);
    
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
    
    console.log('Login response status:', loginResponse.status);
    
    if (loginResponse.status !== 200) {
      const errorData = await loginResponse.json();
      console.log('Login error:', errorData);
    }
    
    expect(loginResponse.status).toBe(200);
    
    // Extract token from Set-Cookie header
    const setCookieHeader = loginResponse.headers.get('Set-Cookie');
    console.log('Set-Cookie header:', setCookieHeader);
    
    const tokenMatch = setCookieHeader?.match(/accessToken=([^;]+)/);
    authToken = tokenMatch?.[1] || '';
    console.log('Extracted token:', authToken);
    
    expect(authToken).toBeTruthy();
  });

  afterEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
  });

  it('should authenticate user correctly', async () => {
    // First test the auth controller's /me endpoint
    const meResponse = await testApp
      .handle(new Request('http://localhost/auth/me', {
        method: 'GET',
        headers: {
          'Cookie': `accessToken=${authToken}`
        }
      }));

    console.log('Auth /me response status:', meResponse.status);
    
    if (meResponse.status !== 200) {
      const errorText = await meResponse.text();
      console.log('Auth /me error:', errorText);
    } else {
      const meData = await meResponse.json();
      console.log('Auth /me response data:', meData);
    }

    expect(meResponse.status).toBe(200);

    // Now test our custom endpoint
    const response = await testApp
      .handle(new Request('http://localhost/test-auth', {
        method: 'GET',
        headers: {
          'Cookie': `accessToken=${authToken}`
        }
      }));

    console.log('Test auth response status:', response.status);
    
    if (response.status !== 200) {
      const errorText = await response.text();
      console.log('Test auth error:', errorText);
    }

    expect(response.status).toBe(200);
    
    const responseData = await response.json();
    console.log('Test auth response data:', responseData);
    
    expect(responseData.success).toBe(true);
    expect(responseData.user.userId).toBe(testUser.id);
    expect(responseData.user.email).toBe(testUser.email);
  });
});