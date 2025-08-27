import { Elysia } from 'elysia';
import { authService } from '../services/auth.js';
import type { JWTPayload } from '../services/auth.js';

export interface AuthContext {
  user: JWTPayload;
}

/**
 * Authentication middleware for Elysia
 * Validates JWT tokens from Authorization header or cookies
 */
export const authMiddleware = new Elysia({ name: 'auth' })
  .derive(async ({ headers, cookie }): Promise<{ user?: JWTPayload }> => {
    // Try to get token from Authorization header first
    let token = authService.extractTokenFromHeader(headers.authorization);
    
    // If no header token, try to get from cookie
    if (!token && cookie.accessToken) {
      token = cookie.accessToken.value || undefined;
    }

    if (!token) {
      return { user: undefined };
    }

    // Validate the token
    const validation = await authService.validateAccessToken(token);
    
    if (!validation.isValid || !validation.payload) {
      // If access token is invalid, try to refresh using refresh token
      const refreshToken = cookie.refreshToken?.value;
      
      if (refreshToken) {
        const newAccessToken = await authService.refreshAccessToken(refreshToken);
        
        if (newAccessToken) {
          // Set new access token in cookie
          cookie.accessToken?.set({
            value: newAccessToken,
            ...authService.getAccessTokenCookieOptions()
          });
          
          // Validate the new token
          const newValidation = await authService.validateAccessToken(newAccessToken);
          if (newValidation.isValid && newValidation.payload) {
            return { user: newValidation.payload };
          }
        }
      }
      
      return { user: undefined };
    }

    return { user: validation.payload };
  });

/**
 * Guard middleware that requires authentication
 * Returns 401 if user is not authenticated
 */
export const requireAuth = new Elysia({ name: 'require-auth' })
  .use(authMiddleware)
  .derive(({ user, set }) => {
    if (!user) {
      set.status = 401;
      throw new Error('UNAUTHORIZED');
    }
    return { user };
  })
  .onError(({ error, set }) => {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
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
  });

/**
 * Optional auth middleware that doesn't require authentication
 * but provides user context if available
 */
export const optionalAuth = authMiddleware;

/**
 * Logout middleware that clears authentication cookies
 */
export const logout = new Elysia({ name: 'logout' })
  .derive(({ cookie }) => {
    // Clear authentication cookies
    cookie.accessToken?.remove();
    cookie.refreshToken?.remove();
    
    return {};
  });