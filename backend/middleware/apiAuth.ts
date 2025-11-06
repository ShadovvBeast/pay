import { Elysia } from 'elysia';
import { apiKeyService } from '../services/apiKey.js';
import type { ApiKey, PublicErrorResponse } from '../types/index.js';

/**
 * API Key Authentication Middleware
 */
export const apiKeyAuth = (requiredResource?: string, requiredAction?: string) => {
  return new Elysia()
    .derive(async ({ headers, set }) => {
      const requestId = crypto.randomUUID();
      
      try {
        // Extract API key from Authorization header
        const authHeader = headers.authorization;
        
        if (!authHeader) {
          set.status = 401;
          const errorResponse: PublicErrorResponse = {
            error: {
              code: 'MISSING_API_KEY',
              message: 'API key is required. Include it in the Authorization header as "Bearer your_api_key"',
              type: 'authentication_error'
            },
            timestamp: new Date().toISOString(),
            requestId
          };
          throw new Error(JSON.stringify(errorResponse));
        }

        // Check if it's Bearer token format
        if (!authHeader.startsWith('Bearer ')) {
          set.status = 401;
          const errorResponse: PublicErrorResponse = {
            error: {
              code: 'INVALID_AUTH_FORMAT',
              message: 'Authorization header must be in format: "Bearer your_api_key"',
              type: 'authentication_error'
            },
            timestamp: new Date().toISOString(),
            requestId
          };
          throw new Error(JSON.stringify(errorResponse));
        }

        const apiKey = authHeader.substring(7); // Remove "Bearer " prefix

        // Validate API key
        const validation = await apiKeyService.validateApiKey(apiKey);
        
        if (!validation.isValid || !validation.apiKey) {
          set.status = 401;
          const errorResponse: PublicErrorResponse = {
            error: {
              code: 'INVALID_API_KEY',
              message: validation.error || 'Invalid API key',
              type: 'authentication_error'
            },
            timestamp: new Date().toISOString(),
            requestId
          };
          throw new Error(JSON.stringify(errorResponse));
        }

        // Check permissions if required
        if (requiredResource && requiredAction) {
          const hasPermission = apiKeyService.hasPermission(
            validation.apiKey, 
            requiredResource, 
            requiredAction
          );

          if (!hasPermission) {
            set.status = 403;
            const errorResponse: PublicErrorResponse = {
              error: {
                code: 'INSUFFICIENT_PERMISSIONS',
                message: `API key does not have permission to ${requiredAction} ${requiredResource}`,
                type: 'authentication_error'
              },
              timestamp: new Date().toISOString(),
              requestId
            };
            throw new Error(JSON.stringify(errorResponse));
          }
        }

        return {
          apiKey: validation.apiKey,
          requestId
        };

      } catch (error) {
        if (error instanceof Error && error.message.startsWith('{')) {
          // Re-throw formatted error responses
          const errorData = JSON.parse(error.message);
          return errorData;
        }
        
        // Handle unexpected errors
        set.status = 500;
        const errorResponse: PublicErrorResponse = {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Authentication failed',
            type: 'api_error'
          },
          timestamp: new Date().toISOString(),
          requestId
        };
        return errorResponse;
      }
    });
};

/**
 * Middleware to log API usage
 */
export const logApiUsage = new Elysia()
  .onAfterHandle(async ({ apiKey, request, set }) => {
    if (apiKey && 'id' in apiKey) {
      try {
        const url = new URL(request.url);
        const endpoint = url.pathname;
        const method = request.method;
        const statusCode = set.status || 200;
        const ipAddress = request.headers.get('x-forwarded-for') || 
                         request.headers.get('x-real-ip') || 
                         'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';
        const requestId = (apiKey as any).requestId;

        await apiKeyService.logUsage(
          (apiKey as ApiKey).id,
          endpoint,
          method,
          statusCode,
          ipAddress,
          userAgent,
          requestId
        );
      } catch (error) {
        console.error('Failed to log API usage:', error);
        // Don't fail the request if logging fails
      }
    }
  });