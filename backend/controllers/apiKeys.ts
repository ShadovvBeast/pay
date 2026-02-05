import { Elysia, t } from 'elysia';
import { apiKeyService } from '../services/apiKey.js';
import { authService } from '../services/auth.js';
import type { 
  ErrorResponse, 
  ApiKeyResponse, 
  ApiKeyListResponse, 
  CreateApiKeyData,
  ApiKeyPermission 
} from '../types/index.js';
import { db } from '../services/database.js';

// Request types
interface CreateApiKeyRequest {
  name: string;
  permissions: ApiKeyPermission[];
  expiresAt?: string; // ISO date string
}

interface UpdateApiKeyRequest {
  name?: string;
  permissions?: ApiKeyPermission[];
  isActive?: boolean;
  expiresAt?: string; // ISO date string
}

/**
 * API Key Management Controller
 * Handles CRUD operations for API keys (requires regular JWT auth)
 */
export const apiKeyController = new Elysia({ prefix: '/api-keys' })
  
  // Create new API key
  .post('/', async ({ body, headers, cookie, set }) => {
    try {
      // Manual authentication check (same as other protected endpoints)
      let token = authService.extractTokenFromHeader(headers.authorization);
      
      if (!token && cookie.accessToken) {
        token = cookie.accessToken.value || undefined;
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

      const requestData = body as CreateApiKeyRequest;
      
      // Validate permissions
      const validResources = ['payments', 'transactions', 'webhooks', 'profile'];
      const validActions = ['create', 'read', 'update', 'delete'];
      
      for (const permission of requestData.permissions) {
        if (!validResources.includes(permission.resource)) {
          set.status = 400;
          const errorResponse: ErrorResponse = {
            error: {
              code: 'INVALID_PERMISSION',
              message: `Invalid resource: ${permission.resource}. Valid resources: ${validResources.join(', ')}`
            },
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          };
          return errorResponse;
        }

        for (const action of permission.actions) {
          if (!validActions.includes(action)) {
            set.status = 400;
            const errorResponse: ErrorResponse = {
              error: {
                code: 'INVALID_PERMISSION',
                message: `Invalid action: ${action}. Valid actions: ${validActions.join(', ')}`
              },
              timestamp: new Date().toISOString(),
              requestId: crypto.randomUUID()
            };
            return errorResponse;
          }
        }
      }

      // Validate and convert expiration date
      let expiresAt: Date | undefined;
      if (requestData.expiresAt) {
        try {
          expiresAt = new Date(requestData.expiresAt);
          if (isNaN(expiresAt.getTime())) {
            set.status = 400;
            const errorResponse: ErrorResponse = {
              error: {
                code: 'INVALID_DATE',
                message: 'Invalid expiration date format'
              },
              timestamp: new Date().toISOString(),
              requestId: crypto.randomUUID()
            };
            return errorResponse;
          }
          
          // Check if date is in the past
          if (expiresAt <= new Date()) {
            set.status = 400;
            const errorResponse: ErrorResponse = {
              error: {
                code: 'INVALID_DATE',
                message: 'Expiration date must be in the future'
              },
              timestamp: new Date().toISOString(),
              requestId: crypto.randomUUID()
            };
            return errorResponse;
          }
        } catch (error) {
          set.status = 400;
          const errorResponse: ErrorResponse = {
            error: {
              code: 'INVALID_DATE',
              message: 'Invalid expiration date format'
            },
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          };
          return errorResponse;
        }
      }

      const createData: CreateApiKeyData = {
        userId: validation.payload.userId,
        name: requestData.name,
        permissions: requestData.permissions,
        expiresAt
      };

      console.log('Creating API key with data:', createData);
      const result = await apiKeyService.createApiKey(createData);
      console.log('API key created successfully:', { id: result.apiKey.id, name: result.apiKey.name });

      set.status = 201;
      
      const response: ApiKeyResponse = {
        id: result.apiKey.id,
        name: result.apiKey.name,
        key: result.key, // Only returned on creation
        prefix: result.apiKey.prefix,
        permissions: result.apiKey.permissions,
        isActive: result.apiKey.isActive,
        lastUsedAt: result.apiKey.lastUsedAt,
        expiresAt: result.apiKey.expiresAt,
        createdAt: result.apiKey.createdAt
      };

      return response;

    } catch (error) {
      console.error('API key creation error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        requestData
      });
      
      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? `Failed to create API key: ${error.message}` : 'Failed to create API key'
        },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      };
      return errorResponse;
    }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 255 }),
      permissions: t.Array(t.Object({
        resource: t.Union([
          t.Literal('payments'),
          t.Literal('transactions'),
          t.Literal('webhooks'),
          t.Literal('profile')
        ]),
        actions: t.Array(t.Union([
          t.Literal('create'),
          t.Literal('read'),
          t.Literal('update'),
          t.Literal('delete')
        ]))
      })),
      expiresAt: t.Optional(t.String())
    })
  })

  // List user's API keys
  .get('/', async ({ headers, cookie, set }) => {
    try {
      // Manual authentication check
      let token = authService.extractTokenFromHeader(headers.authorization);
      
      if (!token && cookie.accessToken) {
        token = cookie.accessToken.value || undefined;
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

      const apiKeys = await apiKeyService.getUserApiKeys(validation.payload.userId);

      const response: ApiKeyListResponse[] = apiKeys.map(key => ({
        id: key.id,
        name: key.name,
        prefix: key.prefix,
        permissions: key.permissions,
        isActive: key.isActive,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt
      }));

      return response;

    } catch (error) {
      console.error('API keys list error:', error);
      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve API keys'
        },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      };
      return errorResponse;
    }
  })

  // Update API key
  .put('/:id', async ({ params, body, headers, cookie, set }) => {
    try {
      // Manual authentication check
      let token = authService.extractTokenFromHeader(headers.authorization);
      
      if (!token && cookie.accessToken) {
        token = cookie.accessToken.value || undefined;
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

      const requestData = body as UpdateApiKeyRequest;
      const keyId = params.id;

      const updates: any = {};
      
      if (requestData.name !== undefined) {
        updates.name = requestData.name;
      }
      
      if (requestData.permissions !== undefined) {
        updates.permissions = requestData.permissions;
      }
      
      if (requestData.isActive !== undefined) {
        updates.isActive = requestData.isActive;
      }
      
      if (requestData.expiresAt !== undefined) {
        updates.expiresAt = new Date(requestData.expiresAt);
      }

      const updatedKey = await apiKeyService.updateApiKey(keyId, validation.payload.userId, updates);

      if (!updatedKey) {
        set.status = 404;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'API_KEY_NOT_FOUND',
            message: 'API key not found'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        return errorResponse;
      }

      const response: ApiKeyListResponse = {
        id: updatedKey.id,
        name: updatedKey.name,
        prefix: updatedKey.prefix,
        permissions: updatedKey.permissions,
        isActive: updatedKey.isActive,
        lastUsedAt: updatedKey.lastUsedAt,
        expiresAt: updatedKey.expiresAt,
        createdAt: updatedKey.createdAt
      };

      return response;

    } catch (error) {
      console.error('API key update error:', error);
      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update API key'
        },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      };
      return errorResponse;
    }
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' })
    }),
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      permissions: t.Optional(t.Array(t.Object({
        resource: t.Union([
          t.Literal('payments'),
          t.Literal('transactions'),
          t.Literal('webhooks'),
          t.Literal('profile')
        ]),
        actions: t.Array(t.Union([
          t.Literal('create'),
          t.Literal('read'),
          t.Literal('update'),
          t.Literal('delete')
        ]))
      }))),
      isActive: t.Optional(t.Boolean()),
      expiresAt: t.Optional(t.String())
    })
  })

  // Delete API key
  .delete('/:id', async ({ params, headers, cookie, set }) => {
    try {
      // Manual authentication check
      let token = authService.extractTokenFromHeader(headers.authorization);
      
      if (!token && cookie.accessToken) {
        token = cookie.accessToken.value || undefined;
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

      const keyId = params.id;
      const deleted = await apiKeyService.deleteApiKey(keyId, validation.payload.userId);

      if (!deleted) {
        set.status = 404;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'API_KEY_NOT_FOUND',
            message: 'API key not found'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        return errorResponse;
      }

      return {
        message: 'API key deleted successfully'
      };

    } catch (error) {
      console.error('API key deletion error:', error);
      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete API key'
        },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      };
      return errorResponse;
    }
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' })
    })
  })

  // Get API key usage statistics
  .get('/:id/usage', async ({ params, query, headers, cookie, set }) => {
    try {
      // Manual authentication check
      let token = authService.extractTokenFromHeader(headers.authorization);
      
      if (!token && cookie.accessToken) {
        token = cookie.accessToken.value || undefined;
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

      const keyId = params.id;
      const days = parseInt(query.days as string) || 30;

      // Verify the API key belongs to the user
      const userApiKeys = await apiKeyService.getUserApiKeys(validation.payload.userId);
      const apiKey = userApiKeys.find(key => key.id === keyId);

      if (!apiKey) {
        set.status = 404;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'API_KEY_NOT_FOUND',
            message: 'API key not found'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        return errorResponse;
      }

      const stats = await apiKeyService.getUsageStats(keyId, days);

      return stats;

    } catch (error) {
      console.error('API key usage stats error:', error);
      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve usage statistics'
        },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      };
      return errorResponse;
    }
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' })
    }),
    query: t.Object({
      days: t.Optional(t.String({ pattern: '^[0-9]+$' }))
    })
  });