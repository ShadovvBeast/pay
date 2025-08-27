import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { AuthService, authService } from '../auth.js';
import { User } from '../../types/index.js';

// Mock user for testing
const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  shopName: 'Test Shop',
  ownerName: 'Test Owner',
  merchantConfig: {
    merchantId: 'test-merchant',
    terminalId: 'test-terminal',
    successUrl: 'https://example.com/success',
    failureUrl: 'https://example.com/failure',
    notificationUrl: 'https://example.com/notify',
    currency: 'ILS',
    language: 'he'
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('AuthService', () => {
  let authServiceInstance: AuthService;
  
  beforeEach(() => {
    // Create fresh instance for each test
    authServiceInstance = new AuthService();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_ACCESS_EXPIRY;
    delete process.env.JWT_REFRESH_EXPIRY;
  });

  describe('constructor', () => {
    it('should use default values when environment variables are not set', () => {
      const service = new AuthService();
      expect(service).toBeDefined();
    });

    it('should throw error in production with default secrets', () => {
      process.env.NODE_ENV = 'production';
      
      expect(() => new AuthService()).toThrow('JWT secrets must be set in production environment');
      
      delete process.env.NODE_ENV;
    });

    it('should not throw error in production with custom secrets', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'custom-secret';
      process.env.JWT_REFRESH_SECRET = 'custom-refresh-secret';
      
      expect(() => new AuthService()).not.toThrow();
      
      delete process.env.NODE_ENV;
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const tokens = await authServiceInstance.generateTokens(mockUser);
      
      expect(tokens).toBeDefined();
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });

    it('should generate tokens with correct payload', async () => {
      const tokens = await authServiceInstance.generateTokens(mockUser);
      
      const accessValidation = await authServiceInstance.validateAccessToken(tokens.accessToken);
      const refreshValidation = await authServiceInstance.validateRefreshToken(tokens.refreshToken);
      
      expect(accessValidation.isValid).toBe(true);
      expect(accessValidation.payload?.userId).toBe(mockUser.id);
      expect(accessValidation.payload?.email).toBe(mockUser.email);
      
      expect(refreshValidation.isValid).toBe(true);
      expect(refreshValidation.payload?.userId).toBe(mockUser.id);
      expect(refreshValidation.payload?.email).toBe(mockUser.email);
    });
  });

  describe('validateAccessToken', () => {
    it('should validate valid access token', async () => {
      const tokens = await authServiceInstance.generateTokens(mockUser);
      const validation = await authServiceInstance.validateAccessToken(tokens.accessToken);
      
      expect(validation.isValid).toBe(true);
      expect(validation.payload).toBeDefined();
      expect(validation.payload?.userId).toBe(mockUser.id);
      expect(validation.payload?.email).toBe(mockUser.email);
      expect(validation.error).toBeUndefined();
    });

    it('should reject invalid token', async () => {
      const validation = await authServiceInstance.validateAccessToken('invalid-token');
      
      expect(validation.isValid).toBe(false);
      expect(validation.payload).toBeUndefined();
      expect(validation.error).toBeDefined();
    });

    it('should reject empty token', async () => {
      const validation = await authServiceInstance.validateAccessToken('');
      
      expect(validation.isValid).toBe(false);
      expect(validation.payload).toBeUndefined();
      expect(validation.error).toBeDefined();
    });

    it('should reject refresh token as access token', async () => {
      const tokens = await authServiceInstance.generateTokens(mockUser);
      const validation = await authServiceInstance.validateAccessToken(tokens.refreshToken);
      
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBeDefined();
    });
  });

  describe('validateRefreshToken', () => {
    it('should validate valid refresh token', async () => {
      const tokens = await authServiceInstance.generateTokens(mockUser);
      const validation = await authServiceInstance.validateRefreshToken(tokens.refreshToken);
      
      expect(validation.isValid).toBe(true);
      expect(validation.payload).toBeDefined();
      expect(validation.payload?.userId).toBe(mockUser.id);
      expect(validation.payload?.email).toBe(mockUser.email);
      expect(validation.error).toBeUndefined();
    });

    it('should reject invalid refresh token', async () => {
      const validation = await authServiceInstance.validateRefreshToken('invalid-token');
      
      expect(validation.isValid).toBe(false);
      expect(validation.payload).toBeUndefined();
      expect(validation.error).toBeDefined();
    });

    it('should reject access token as refresh token', async () => {
      const tokens = await authServiceInstance.generateTokens(mockUser);
      const validation = await authServiceInstance.validateRefreshToken(tokens.accessToken);
      
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBeDefined();
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new access token from valid refresh token', async () => {
      const tokens = await authServiceInstance.generateTokens(mockUser);
      const newAccessToken = await authServiceInstance.refreshAccessToken(tokens.refreshToken);
      
      expect(newAccessToken).toBeDefined();
      expect(typeof newAccessToken).toBe('string');
      
      // Validate the new access token
      const validation = await authServiceInstance.validateAccessToken(newAccessToken!);
      expect(validation.isValid).toBe(true);
      expect(validation.payload?.userId).toBe(mockUser.id);
      expect(validation.payload?.email).toBe(mockUser.email);
      
      // Ensure both tokens are valid (even if they might be identical due to same timestamp)
      const originalValidation = await authServiceInstance.validateAccessToken(tokens.accessToken);
      expect(originalValidation.isValid).toBe(true);
    });

    it('should return null for invalid refresh token', async () => {
      const newAccessToken = await authServiceInstance.refreshAccessToken('invalid-token');
      
      expect(newAccessToken).toBeNull();
    });

    it('should return null for empty refresh token', async () => {
      const newAccessToken = await authServiceInstance.refreshAccessToken('');
      
      expect(newAccessToken).toBeNull();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'test-token-123';
      const header = `Bearer ${token}`;
      
      const extracted = authServiceInstance.extractTokenFromHeader(header);
      
      expect(extracted).toBe(token);
    });

    it('should return null for invalid header format', () => {
      const extracted = authServiceInstance.extractTokenFromHeader('Invalid token-123');
      
      expect(extracted).toBeNull();
    });

    it('should return null for missing Bearer prefix', () => {
      const extracted = authServiceInstance.extractTokenFromHeader('token-123');
      
      expect(extracted).toBeNull();
    });

    it('should return null for undefined header', () => {
      const extracted = authServiceInstance.extractTokenFromHeader(undefined);
      
      expect(extracted).toBeNull();
    });

    it('should return null for empty header', () => {
      const extracted = authServiceInstance.extractTokenFromHeader('');
      
      expect(extracted).toBeNull();
    });

    it('should return null for header with extra parts', () => {
      const extracted = authServiceInstance.extractTokenFromHeader('Bearer token extra-part');
      
      expect(extracted).toBeNull();
    });
  });

  describe('cookie options', () => {
    it('should return secure cookie options', () => {
      const options = authServiceInstance.getSecureCookieOptions();
      
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('strict');
      expect(options.path).toBe('/');
      expect(options.maxAge).toBe(7 * 24 * 60 * 60);
    });

    it('should return access token cookie options with shorter expiry', () => {
      const options = authServiceInstance.getAccessTokenCookieOptions();
      
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('strict');
      expect(options.path).toBe('/');
      expect(options.maxAge).toBe(15 * 60);
    });

    it('should set secure flag in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'custom-secret';
      process.env.JWT_REFRESH_SECRET = 'custom-refresh-secret';
      
      const service = new AuthService();
      const options = service.getSecureCookieOptions();
      
      expect(options.secure).toBe(true);
      
      delete process.env.NODE_ENV;
    });

    it('should not set secure flag in development', () => {
      process.env.NODE_ENV = 'development';
      
      const service = new AuthService();
      const options = service.getSecureCookieOptions();
      
      expect(options.secure).toBe(false);
      
      delete process.env.NODE_ENV;
    });
  });

  describe('token expiry parsing', () => {
    it('should handle custom expiry times', async () => {
      process.env.JWT_ACCESS_EXPIRY = '30m';
      process.env.JWT_REFRESH_EXPIRY = '14d';
      
      const service = new AuthService();
      const tokens = await service.generateTokens(mockUser);
      
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
    });
  });

  describe('singleton instance', () => {
    it('should export singleton instance', () => {
      expect(authService).toBeDefined();
      expect(authService).toBeInstanceOf(AuthService);
    });
  });
});

describe('Token expiration', () => {
  it('should reject expired tokens', async () => {
    // Create service with very short expiry for testing
    process.env.JWT_ACCESS_EXPIRY = '1s';
    const service = new AuthService();
    
    const tokens = await service.generateTokens(mockUser);
    
    // Wait for token to expire
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const validation = await service.validateAccessToken(tokens.accessToken);
    
    expect(validation.isValid).toBe(false);
    expect(validation.error).toBeDefined();
  });
});

describe('Error handling', () => {
  let testAuthService: AuthService;
  
  beforeEach(() => {
    testAuthService = new AuthService();
  });

  it('should handle malformed JWT tokens gracefully', async () => {
    const validation = await testAuthService.validateAccessToken('not.a.jwt');
    
    expect(validation.isValid).toBe(false);
    expect(validation.error).toBeDefined();
  });

  it('should handle tokens with invalid structure', async () => {
    // Create a token with missing required fields
    const invalidPayload = { someField: 'value' };
    
    // This would require access to private methods, so we test with a malformed token instead
    const validation = await testAuthService.validateAccessToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzb21lRmllbGQiOiJ2YWx1ZSJ9.invalid');
    
    expect(validation.isValid).toBe(false);
    expect(validation.error).toBeDefined();
  });
});