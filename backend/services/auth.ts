import { sign, verify } from 'jsonwebtoken';
import type { User } from '../types/index.js';

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenValidationResult {
  isValid: boolean;
  payload?: JWTPayload;
  error?: string;
}

/**
 * JWT Authentication Service
 * Handles token generation, validation, and management
 */
export class AuthService {
  private jwtSecret: string;
  private refreshSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
    
    if (process.env.NODE_ENV === 'production' && 
        (this.jwtSecret.includes('change-in-production') || this.refreshSecret.includes('change-in-production'))) {
      throw new Error('JWT secrets must be set in production environment');
    }
  }

  /**
   * Generates access and refresh tokens for a user
   */
  async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email
    };

    const accessToken = await this.signToken(payload, this.jwtSecret, this.accessTokenExpiry);
    const refreshToken = await this.signToken(payload, this.refreshSecret, this.refreshTokenExpiry);

    return {
      accessToken,
      refreshToken
    };
  }

  /**
   * Validates an access token
   */
  async validateAccessToken(token: string): Promise<TokenValidationResult> {
    return this.validateToken(token, this.jwtSecret);
  }

  /**
   * Validates a refresh token
   */
  async validateRefreshToken(token: string): Promise<TokenValidationResult> {
    return this.validateToken(token, this.refreshSecret);
  }

  /**
   * Refreshes access token using a valid refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<string | null> {
    const validation = await this.validateRefreshToken(refreshToken);
    
    if (!validation.isValid || !validation.payload) {
      return null;
    }

    // Generate new access token with same payload
    const newPayload: JWTPayload = {
      userId: validation.payload.userId,
      email: validation.payload.email
    };

    return this.signToken(newPayload, this.jwtSecret, this.accessTokenExpiry);
  }

  /**
   * Extracts token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | undefined): string | undefined {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Creates secure cookie options for token storage
   */
  getSecureCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    };
  }

  /**
   * Creates cookie options for access token (shorter expiry)
   */
  getAccessTokenCookieOptions() {
    return {
      ...this.getSecureCookieOptions(),
      maxAge: 15 * 60 // 15 minutes in seconds
    };
  }

  /**
   * Private method to sign JWT tokens
   */
  private async signToken(payload: JWTPayload, secret: string, expiresIn: string): Promise<string> {
    return new Promise((resolve, reject) => {
      sign(payload, secret, { expiresIn: expiresIn as string }, (err, token) => {
        if (err || !token) {
          reject(err || new Error('Failed to sign token'));
        } else {
          resolve(token);
        }
      });
    });
  }

  /**
   * Private method to validate JWT tokens
   */
  private async validateToken(token: string, secret: string): Promise<TokenValidationResult> {
    return new Promise((resolve) => {
      verify(token, secret, (err, decoded) => {
        if (err) {
          resolve({
            isValid: false,
            error: err.message
          });
          return;
        }

        const payload = decoded as JWTPayload;
        
        if (!payload) {
          resolve({
            isValid: false,
            error: 'Invalid token payload'
          });
          return;
        }

        // Validate required fields
        if (!payload.userId || !payload.email) {
          resolve({
            isValid: false,
            error: 'Invalid token structure'
          });
          return;
        }

        resolve({
          isValid: true,
          payload: payload
        });
      });
    });
  }
}

// Export singleton instance
export const authService = new AuthService();