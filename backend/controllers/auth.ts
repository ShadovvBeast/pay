import { Elysia, t } from 'elysia';
import { authService } from '../services/auth.js';
import { userRepository } from '../services/repository.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { validateUserData, sanitizeUserData } from '../models/user.js';
import { requireAuth, logout } from '../middleware/auth.js';
import type { User, CreateUserData, ErrorResponse, MerchantConfig } from '../types/index.js';

// Request/Response types
interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword?: string;
  shopName: string;
  ownerName: string;
  merchantConfig: {
    companyNumber: string;
    currency: string;
    language: string;
  };
}

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    shopName: string;
    ownerName: string;
    merchantConfig: User['merchantConfig'];
    createdAt: Date;
    updatedAt: Date;
  };
  message: string;
}

/**
 * Authentication controller with Elysia routes
 */
export const authController = new Elysia({ prefix: '/auth' })
  .post('/register', async ({ body, set, cookie }) => {
    try {
      const registerData = body as RegisterRequest;
      
      // Create merchant config from registration data
      const fullMerchantConfig: MerchantConfig = {
        companyNumber: registerData.merchantConfig.companyNumber,
        currency: registerData.merchantConfig.currency,
        language: registerData.merchantConfig.language
      };

      // Sanitize input data
      const sanitizedData: CreateUserData = sanitizeUserData({
        email: registerData.email,
        password: registerData.password,
        shopName: registerData.shopName,
        ownerName: registerData.ownerName,
        merchantConfig: fullMerchantConfig
      });

      // Validate user data
      const validation = validateUserData(sanitizedData);
      if (!validation.isValid) {
        set.status = 400;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid registration data',
            details: validation.errors
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        return errorResponse;
      }

      // Check if user already exists
      const existingUser = await userRepository.findByEmail(sanitizedData.email);
      if (existingUser) {
        set.status = 409;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        return errorResponse;
      }

      // Hash password
      const hashedPassword = await hashPassword(sanitizedData.password);

      // Create user with hashed password
      const userDataWithHash: CreateUserData = {
        ...sanitizedData,
        password: hashedPassword
      };

      const newUser = await userRepository.create(userDataWithHash);

      // Generate tokens
      const tokens = await authService.generateTokens(newUser);

      // Set secure cookies
      cookie.accessToken?.set({
        value: tokens.accessToken,
        ...authService.getAccessTokenCookieOptions()
      });

      cookie.refreshToken?.set({
        value: tokens.refreshToken,
        ...authService.getSecureCookieOptions()
      });

      set.status = 201;
      
      const response: AuthResponse = {
        user: {
          id: newUser.id,
          email: newUser.email,
          shopName: newUser.shopName,
          ownerName: newUser.ownerName,
          merchantConfig: newUser.merchantConfig,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt
        },
        message: 'User registered successfully'
      };

      return response;

    } catch (error) {
      console.error('Registration error:', error);
      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to register user'
        },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      };
      return errorResponse;
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 8 }),
      shopName: t.String({ minLength: 2, maxLength: 100 }),
      ownerName: t.String({ minLength: 2, maxLength: 100 }),
      merchantConfig: t.Object({
        companyNumber: t.String({ minLength: 1 }),
        currency: t.String({ pattern: '^[A-Z]{3}$' }),
        language: t.String({ pattern: '^[a-z]{2}$' })
      })
    })
  })
  
  .post('/login', async ({ body, set, cookie }) => {
    try {
      const loginData = body as LoginRequest;

      // Basic input validation
      if (!loginData.email || !loginData.password) {
        set.status = 400;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        return errorResponse;
      }

      // Find user by email
      const user = await userRepository.findByEmail(loginData.email.trim().toLowerCase());
      if (!user) {
        set.status = 401;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        return errorResponse;
      }

      // Verify password
      const isPasswordValid = await verifyPassword(loginData.password, user.passwordHash);
      if (!isPasswordValid) {
        set.status = 401;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        return errorResponse;
      }

      // Generate tokens
      const tokens = await authService.generateTokens(user);

      // Set secure cookies
      cookie.accessToken?.set({
        value: tokens.accessToken,
        ...authService.getAccessTokenCookieOptions()
      });

      cookie.refreshToken?.set({
        value: tokens.refreshToken,
        ...authService.getSecureCookieOptions()
      });

      const response: AuthResponse = {
        user: {
          id: user.id,
          email: user.email,
          shopName: user.shopName,
          ownerName: user.ownerName,
          merchantConfig: user.merchantConfig,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        message: 'Login successful'
      };

      return response;

    } catch (error) {
      console.error('Login error:', error);
      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to login'
        },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      };
      return errorResponse;
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 1 })
    })
  })

  .get('/me', async ({ headers, cookie, set }) => {
    try {
      // Extract and validate token
      let token = authService.extractTokenFromHeader(headers.authorization);
      
      if (!token && cookie.accessToken) {
        token = cookie.accessToken.value || null;
      }

      if (!token) {
        set.status = 401;
        return {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
      }

      const validation = await authService.validateAccessToken(token);
      
      if (!validation.isValid || !validation.payload) {
        set.status = 401;
        return {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid token'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
      }

      // Get fresh user data from database
      const currentUser = await userRepository.findById(validation.payload.userId);
      
      if (!currentUser) {
        set.status = 404;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        return errorResponse;
      }

      const response: AuthResponse = {
        user: {
          id: currentUser.id,
          email: currentUser.email,
          shopName: currentUser.shopName,
          ownerName: currentUser.ownerName,
          merchantConfig: currentUser.merchantConfig,
          createdAt: currentUser.createdAt,
          updatedAt: currentUser.updatedAt
        },
        message: 'User profile retrieved successfully'
      };

      return response;

    } catch (error) {
      console.error('Get profile error:', error);
      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user profile'
        },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      };
      return errorResponse;
    }
  })

  .post('/refresh', async ({ cookie, set }) => {
    try {
      const refreshToken = cookie.refreshToken?.value;
      
      if (!refreshToken) {
        set.status = 401;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'NO_REFRESH_TOKEN',
            message: 'Refresh token not found'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        return errorResponse;
      }

      const newAccessToken = await authService.refreshAccessToken(refreshToken);
      
      if (!newAccessToken) {
        set.status = 401;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid or expired refresh token'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        return errorResponse;
      }

      // Set new access token cookie
      cookie.accessToken?.set({
        value: newAccessToken,
        ...authService.getAccessTokenCookieOptions()
      });

      return {
        message: 'Access token refreshed successfully'
      };

    } catch (error) {
      console.error('Token refresh error:', error);
      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to refresh token'
        },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      };
      return errorResponse;
    }
  })

  .put('/update', async ({ body, headers, cookie, set }) => {
    try {
      // Extract and validate token
      let token = authService.extractTokenFromHeader(headers.authorization);
      
      if (!token && cookie.accessToken) {
        token = cookie.accessToken.value || null;
      }

      if (!token) {
        set.status = 401;
        return {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
      }

      const validation = await authService.validateAccessToken(token);
      
      if (!validation.isValid || !validation.payload) {
        set.status = 401;
        return {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid token'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
      }

      const updateData = body as Partial<User>;
      const userId = validation.payload.userId;

      // Update user in database
      const updatedUser = await userRepository.update(userId, {
        shopName: updateData.shopName,
        ownerName: updateData.ownerName,
        email: updateData.email,
        merchantConfig: updateData.merchantConfig
      });

      if (!updatedUser) {
        set.status = 404;
        return {
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
      }

      const response: AuthResponse = {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          shopName: updatedUser.shopName,
          ownerName: updatedUser.ownerName,
          merchantConfig: updatedUser.merchantConfig,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        },
        message: 'User updated successfully'
      };

      return response;

    } catch (error) {
      console.error('Update user error:', error);
      set.status = 500;
      return {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user'
        },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      };
    }
  }, {
    body: t.Object({
      shopName: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
      ownerName: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
      email: t.Optional(t.String({ format: 'email' })),
      merchantConfig: t.Optional(t.Object({
        companyNumber: t.Optional(t.String({ minLength: 1 })),
        currency: t.Optional(t.String({ pattern: '^[A-Z]{3}$' })),
        language: t.Optional(t.String({ pattern: '^[a-z]{2}$' }))
      }))
    })
  })

  .use(logout)
  .post('/logout', async ({ set }) => {
    return {
      message: 'Logged out successfully'
    };
  })

  .get('/validate', async ({ headers, cookie, set }) => {
    try {
      // Try to get token from Authorization header first
      let token = authService.extractTokenFromHeader(headers.authorization);
      
      // If no header token, try to get from cookie
      if (!token && cookie.accessToken) {
        token = cookie.accessToken.value || null;
      }

      if (!token) {
        set.status = 401;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'NO_TOKEN',
            message: 'No authentication token provided'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        return errorResponse;
      }

      const validation = await authService.validateAccessToken(token);
      
      if (!validation.isValid || !validation.payload) {
        set.status = 401;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INVALID_TOKEN',
            message: validation.error || 'Invalid token'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        return errorResponse;
      }

      return {
        valid: true,
        user: {
          userId: validation.payload.userId,
          email: validation.payload.email
        },
        message: 'Token is valid'
      };

    } catch (error) {
      console.error('Token validation error:', error);
      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate token'
        },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      };
      return errorResponse;
    }
  });