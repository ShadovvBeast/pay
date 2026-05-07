import { Elysia } from 'elysia';

/**
 * API Documentation Controller
 * Serves Swagger UI and OpenAPI 3.0 specification for all SB0 Pay endpoints
 */

const OPENAPI_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'SB0 Pay API',
    version: '1.3.0',
    description: `SB0 Pay is a mobile-first Point of Sale (PoS) system that integrates with AllPay and mobile money providers (MTN MoMo, Airtel Money, M-Pesa).

## Authentication

There are two authentication methods:

- **JWT (Cookie/Bearer)** — Used by the merchant dashboard UI. Obtained via \`/auth/login\`.
- **API Key (Bearer)** — Used by third-party integrations via \`/api/v1/*\`. Keys are prefixed with \`sb0_live_\` or \`sb0_test_\`.

## Payment Methods

- **card** — Credit/debit card via AllPay gateway
- **mtn_momo** — MTN Mobile Money
- **airtel_money** — Airtel Money
- **mpesa** — M-Pesa (Safaricom)
- **mobile_money** — Auto-route by phone number prefix

## Important Notes

- All amounts are in **decimal format** (e.g. \`342.60\` for 342.60 ILS), NOT in minor units.
- When using \`lineItems\`, the sum of (price × quantity) for all items must equal the total \`amount\` (±0.01 tolerance).
- Mobile money payments require a \`customerPhone\` field.
- Consistent error format: \`{ error: { code, message, type?, details? }, timestamp, requestId }\``,
    contact: {
      name: 'SB0 Pay Support',
      url: 'https://sb0pay.web.app',
    },
  },
  servers: [
    { url: 'http://localhost:3001', description: 'Local development' },
    { url: 'https://sb0pay-410118487888.us-central1.run.app', description: 'Production' },
  ],
  tags: [
    { name: 'Health', description: 'Server health and status' },
    { name: 'Auth', description: 'Merchant authentication (JWT)' },
    { name: 'Payments (Merchant)', description: 'Payment operations via merchant dashboard (JWT auth)' },
    { name: 'API Keys', description: 'API key management for third-party integrations (JWT auth)' },
    { name: 'Public API', description: 'Third-party payment integration endpoints (API key auth)' },
    { name: 'Webhooks', description: 'Payment provider callback endpoints (no auth)' },
    { name: 'Providers', description: 'Payment provider information' },
    { name: 'Wallet', description: 'Merchant wallet — balance, deposits, and withdrawals (JWT auth)' },
  ],
  components: {
    securitySchemes: {
      jwtAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token obtained from /auth/login',
      },
      apiKeyAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        description: 'API key with prefix sb0_live_ or sb0_test_',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Invalid request data' },
              type: { type: 'string', example: 'invalid_request' },
              details: { type: 'object' },
            },
            required: ['code', 'message'],
          },
          timestamp: { type: 'string', format: 'date-time' },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
      MerchantConfig: {
        type: 'object',
        properties: {
          companyNumber: { type: 'string', example: '123456789' },
          currency: { type: 'string', pattern: '^[A-Z]{3}$', example: 'ILS' },
          language: { type: 'string', pattern: '^[a-z]{2}$', example: 'en' },
        },
        required: ['companyNumber', 'currency', 'language'],
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          shopName: { type: 'string' },
          ownerName: { type: 'string' },
          merchantConfig: { $ref: '#/components/schemas/MerchantConfig' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          tokens: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
          message: { type: 'string' },
        },
      },
      Transaction: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          amount: { type: 'number', example: 100.5 },
          currency: { type: 'string', example: 'ILS' },
          status: {
            type: 'string',
            enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
          },
          paymentUrl: { type: 'string', format: 'uri' },
          paymentMethod: { type: 'string', enum: ['card', 'mtn_momo', 'airtel_money', 'mpesa', 'mobile_money'], description: 'Payment method used' },
          paymentProvider: { type: 'string', enum: ['allpay', 'mtn_momo', 'airtel_money', 'mpesa'], description: 'Payment provider' },
          customerPhone: { type: 'string', description: 'Customer phone (for mobile money)' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PaymentResponse: {
        type: 'object',
        properties: {
          transaction: { $ref: '#/components/schemas/Transaction' },
          paymentUrl: { type: 'string', format: 'uri' },
          qrCodeDataUrl: { type: 'string', description: 'Base64 QR code data URL' },
        },
      },
      LineItem: {
        type: 'object',
        required: ['name', 'price', 'quantity'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          price: { type: 'number', minimum: 0 },
          quantity: { type: 'number', minimum: 1 },
          includesVat: { type: 'boolean' },
        },
      },
      PublicPaymentResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          status: { type: 'string' },
          paymentUrl: { type: 'string', format: 'uri' },
          qrCodeDataUrl: { type: 'string' },
          paymentMethod: { type: 'string' },
          paymentProvider: { type: 'string' },
          description: { type: 'string' },
          lineItems: { type: 'array', items: { $ref: '#/components/schemas/LineItem' } },
          expiresAt: { type: 'string', format: 'date-time' },
          metadata: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PublicTransactionResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          status: { type: 'string' },
          description: { type: 'string' },
          metadata: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ApiKeyPermission: {
        type: 'object',
        required: ['resource', 'actions'],
        properties: {
          resource: { type: 'string', enum: ['payments', 'transactions', 'webhooks', 'profile'] },
          actions: {
            type: 'array',
            items: { type: 'string', enum: ['create', 'read', 'update', 'delete'] },
          },
        },
      },
      ApiKeyResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          key: { type: 'string', description: 'Full API key (only returned on creation)' },
          prefix: { type: 'string', example: 'sb0_live_0b6b...' },
          permissions: { type: 'array', items: { $ref: '#/components/schemas/ApiKeyPermission' } },
          isActive: { type: 'boolean' },
          lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    // ── Health & Info ──────────────────────────────────────────────────
    '/': {
      get: {
        tags: ['Health'],
        summary: 'Server status',
        description: 'Returns a simple string indicating the server is running.',
        responses: { '200': { description: 'Server is running', content: { 'text/plain': { schema: { type: 'string', example: 'SB0 Pay API Server' } } } } },
      },
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns server health including database connection status and pool metrics.',
        responses: {
          '200': {
            description: 'Health status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                    environment: { type: 'string', example: 'development' },
                    database: {
                      type: 'object',
                      properties: {
                        connected: { type: 'boolean' },
                        totalConnections: { type: 'integer' },
                        idleConnections: { type: 'integer' },
                        waitingConnections: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/providers': {
      get: {
        tags: ['Providers'],
        summary: 'List payment providers',
        description: 'Returns available payment providers and supported countries.',
        responses: {
          '200': {
            description: 'Provider list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    providers: { type: 'array', items: { type: 'object' } },
                    countries: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Auth ───────────────────────────────────────────────────────────
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new merchant',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'shopName', 'ownerName', 'merchantConfig'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  shopName: { type: 'string', minLength: 2, maxLength: 100 },
                  ownerName: { type: 'string', minLength: 2, maxLength: 100 },
                  merchantConfig: { $ref: '#/components/schemas/MerchantConfig' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Registration successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '409': { description: 'User already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        description: 'Authenticate with email and password. Returns JWT tokens in response body and sets HTTP-only cookies.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 1 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ jwtAuth: [] }],
        responses: {
          '200': { description: 'User profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        description: 'Uses the refresh token from HTTP-only cookie to issue a new access token.',
        responses: {
          '200': { description: 'Token refreshed', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          '401': { description: 'Invalid refresh token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/update': {
      put: {
        tags: ['Auth'],
        summary: 'Update user profile',
        security: [{ jwtAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  shopName: { type: 'string', minLength: 2, maxLength: 100 },
                  ownerName: { type: 'string', minLength: 2, maxLength: 100 },
                  email: { type: 'string', format: 'email' },
                  merchantConfig: {
                    type: 'object',
                    properties: {
                      companyNumber: { type: 'string' },
                      currency: { type: 'string', pattern: '^[A-Z]{3}$' },
                      language: { type: 'string', pattern: '^[a-z]{2}$' },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Profile updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        description: 'Clears authentication cookies.',
        responses: {
          '200': { description: 'Logged out', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset',
        description: 'Generates a 6-digit reset code. Returns the code so the frontend can email it via EmailJS.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Reset code generated (if account exists)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    resetToken: { type: 'string', example: '618176', description: 'Only present if account exists' },
                    email: { type: 'string' },
                    ownerName: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with code',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'token', 'newPassword'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  token: { type: 'string', minLength: 6, maxLength: 6, description: '6-digit reset code' },
                  newPassword: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Password reset successful', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          '400': { description: 'Invalid or expired code', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/validate': {
      get: {
        tags: ['Auth'],
        summary: 'Validate JWT token',
        security: [{ jwtAuth: [] }],
        responses: {
          '200': {
            description: 'Token is valid',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    valid: { type: 'boolean' },
                    user: {
                      type: 'object',
                      properties: { userId: { type: 'string' }, email: { type: 'string' } },
                    },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '401': { description: 'Invalid token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── Payments (Merchant Dashboard) ─────────────────────────────────
    '/payments': {
      post: {
        tags: ['Payments (Merchant)'],
        summary: 'Create payment',
        description: 'Creates a payment via AllPay or mobile money provider, returns a payment URL and QR code.',
        security: [{ jwtAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount'],
                properties: {
                  amount: { type: 'number', minimum: 0.01, maximum: 999999.99, example: 100.5 },
                  description: { type: 'string', maxLength: 255 },
                  customerEmail: { type: 'string', format: 'email' },
                  paymentMethod: { type: 'string', enum: ['card', 'mtn_momo', 'airtel_money', 'mpesa', 'mobile_money'], description: 'Payment method (defaults to card/AllPay)' },
                  customerPhone: { type: 'string', description: 'Customer phone number (required for mobile money payments)' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Payment created', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentResponse' } } } },
          '400': { description: 'Invalid amount', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '502': { description: 'Payment provider unavailable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/payments/{id}/details': {
      get: {
        tags: ['Payments (Merchant)'],
        summary: 'Get transaction details from AllPay',
        security: [{ jwtAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Transaction details from AllPay' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Access denied', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Transaction not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/payments/{id}/status': {
      get: {
        tags: ['Payments (Merchant)'],
        summary: 'Get payment status',
        security: [{ jwtAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Payment status',
            content: { 'application/json': { schema: { type: 'object', properties: { transaction: { $ref: '#/components/schemas/Transaction' } } } } },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Access denied', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Transaction not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/payments/history': {
      get: {
        tags: ['Payments (Merchant)'],
        summary: 'Get transaction history',
        security: [{ jwtAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } },
        ],
        responses: {
          '200': {
            description: 'Transaction history',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    transactions: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } },
                    pagination: {
                      type: 'object',
                      properties: {
                        limit: { type: 'integer' },
                        offset: { type: 'integer' },
                        total: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/payments/{id}/refund': {
      post: {
        tags: ['Payments (Merchant)'],
        summary: 'Refund payment',
        security: [{ jwtAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { amount: { type: 'number', minimum: 0.01, description: 'Partial refund amount (omit for full refund)' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Refund processed', content: { 'application/json': { schema: { type: 'object', properties: { transaction: { $ref: '#/components/schemas/Transaction' } } } } } },
          '400': { description: 'Invalid refund', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Access denied', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Transaction not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/payments/{id}/cancel': {
      post: {
        tags: ['Payments (Merchant)'],
        summary: 'Cancel payment',
        security: [{ jwtAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Payment cancelled', content: { 'application/json': { schema: { type: 'object', properties: { transaction: { $ref: '#/components/schemas/Transaction' } } } } } },
          '400': { description: 'Cannot cancel (wrong status)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Access denied', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Transaction not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── Webhooks (no auth) ────────────────────────────────────────────
    '/payments/webhook': {
      post: {
        tags: ['Webhooks'],
        summary: 'AllPay webhook',
        description: 'Receives payment status notifications from AllPay. No authentication required.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: {
          '200': { description: 'Webhook processed', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, transactionId: { type: 'string' }, message: { type: 'string' } } } } } },
          '400': { description: 'Processing failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/payments/webhook/mobile-money': {
      post: {
        tags: ['Webhooks'],
        summary: 'Generic mobile money callback',
        description: 'Auto-detects provider (MTN MoMo, Airtel Money, M-Pesa) from payload structure.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: {
          '200': { description: 'Callback processed' },
          '400': { description: 'Unknown provider or invalid payload', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/payments/webhook/mtn-momo': {
      post: {
        tags: ['Webhooks'],
        summary: 'MTN MoMo callback',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Processed' }, '400': { description: 'Invalid callback' } },
      },
    },
    '/payments/webhook/airtel-money': {
      post: {
        tags: ['Webhooks'],
        summary: 'Airtel Money callback',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Processed' }, '400': { description: 'Invalid callback' } },
      },
    },
    '/payments/webhook/mpesa': {
      post: {
        tags: ['Webhooks'],
        summary: 'M-Pesa callback',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Processed' }, '400': { description: 'Invalid callback' } },
      },
    },

    // ── API Keys ──────────────────────────────────────────────────────
    '/api-keys': {
      post: {
        tags: ['API Keys'],
        summary: 'Create API key',
        security: [{ jwtAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'permissions'],
                properties: {
                  name: { type: 'string', minLength: 1, maxLength: 255 },
                  permissions: { type: 'array', items: { $ref: '#/components/schemas/ApiKeyPermission' } },
                  expiresAt: { type: 'string', format: 'date-time', description: 'Optional expiration date (must be in the future)' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'API key created. The full key is only returned once.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiKeyResponse' } } },
          },
          '400': { description: 'Invalid permissions or date', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      get: {
        tags: ['API Keys'],
        summary: 'List API keys',
        security: [{ jwtAuth: [] }],
        responses: {
          '200': {
            description: 'List of API keys (without full key values)',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ApiKeyResponse' } } } },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api-keys/{id}': {
      put: {
        tags: ['API Keys'],
        summary: 'Update API key',
        security: [{ jwtAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', minLength: 1, maxLength: 255 },
                  permissions: { type: 'array', items: { $ref: '#/components/schemas/ApiKeyPermission' } },
                  isActive: { type: 'boolean' },
                  expiresAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'API key updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiKeyResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'API key not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        tags: ['API Keys'],
        summary: 'Delete API key',
        security: [{ jwtAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'API key deleted', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'API key not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api-keys/{id}/usage': {
      get: {
        tags: ['API Keys'],
        summary: 'Get API key usage statistics',
        security: [{ jwtAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'days', in: 'query', schema: { type: 'integer', default: 30, description: 'Number of days to look back' } },
        ],
        responses: {
          '200': { description: 'Usage statistics' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'API key not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── Public API (API Key auth) ─────────────────────────────────────
    '/api/v1/payments': {
      post: {
        tags: ['Public API'],
        summary: 'Create payment',
        description: 'Create a payment via the public API. Requires API key with `payments:create` permission.',
        security: [{ apiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount'],
                properties: {
                  amount: { type: 'number', minimum: 0.01, maximum: 999999.99, description: 'Amount in decimal format (e.g. 100.50)' },
                  currency: { type: 'string', pattern: '^[A-Z]{3}$', description: 'ILS, USD, EUR (defaults to merchant currency)' },
                  language: { type: 'string', enum: ['he', 'en', 'ar', 'ru', 'auto'], description: 'Payment page language' },
                  description: { type: 'string', maxLength: 255 },
                  paymentMethod: { type: 'string', enum: ['card', 'mobile_money', 'auto'] },
                  lineItems: { type: 'array', items: { $ref: '#/components/schemas/LineItem' }, description: 'Sum of (price × quantity) must equal amount' },
                  customerEmail: { type: 'string', maxLength: 320 },
                  customerName: { type: 'string', maxLength: 255 },
                  customerPhone: { type: 'string', maxLength: 50 },
                  customerIdNumber: { type: 'string', maxLength: 20, description: 'Israeli tehudat zehut' },
                  maxInstallments: { type: 'integer', minimum: 1, maximum: 12 },
                  fixedInstallments: { type: 'boolean' },
                  expiresAt: { type: 'string', format: 'date-time' },
                  preauthorize: { type: 'boolean', description: 'Authorize without capturing' },
                  showApplePay: { type: 'boolean' },
                  showBit: { type: 'boolean' },
                  customField1: { type: 'string', maxLength: 255 },
                  customField2: { type: 'string', maxLength: 255 },
                  successUrl: { type: 'string', maxLength: 2048 },
                  cancelUrl: { type: 'string', maxLength: 2048 },
                  webhookUrl: { type: 'string', maxLength: 2048 },
                  metadata: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Payment created', content: { 'application/json': { schema: { $ref: '#/components/schemas/PublicPaymentResponse' } } } },
          '400': { description: 'Invalid request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Authentication failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '502': { description: 'Payment provider unavailable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      get: {
        tags: ['Public API'],
        summary: 'List payments',
        description: 'List payments with pagination. Requires API key with `payments:read` permission.',
        security: [{ apiKeyAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } },
        ],
        responses: {
          '200': {
            description: 'Payments list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/PublicTransactionResponse' } },
                    pagination: {
                      type: 'object',
                      properties: {
                        limit: { type: 'integer' },
                        offset: { type: 'integer' },
                        total: { type: 'integer' },
                        hasMore: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Authentication failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/payments/{id}': {
      get: {
        tags: ['Public API'],
        summary: 'Get payment details',
        description: 'Requires API key with `payments:read` permission.',
        security: [{ apiKeyAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Payment details', content: { 'application/json': { schema: { $ref: '#/components/schemas/PublicTransactionResponse' } } } },
          '401': { description: 'Authentication failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Access denied', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Payment not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/payments/{id}/refund': {
      post: {
        tags: ['Public API'],
        summary: 'Refund payment',
        description: 'Requires API key with `payments:update` permission.',
        security: [{ apiKeyAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { amount: { type: 'number', minimum: 0.01, description: 'Partial refund amount (omit for full refund)' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Refund processed', content: { 'application/json': { schema: { $ref: '#/components/schemas/PublicTransactionResponse' } } } },
          '400': { description: 'Invalid refund', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Authentication failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Access denied', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Payment not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v1/payments/{id}/cancel': {
      post: {
        tags: ['Public API'],
        summary: 'Cancel payment',
        description: 'Requires API key with `payments:update` permission.',
        security: [{ apiKeyAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Payment cancelled', content: { 'application/json': { schema: { $ref: '#/components/schemas/PublicTransactionResponse' } } } },
          '400': { description: 'Cannot cancel (wrong status)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Authentication failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Access denied', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Payment not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── Wallet ─────────────────────────────────────────────────────────
    '/wallet/balance': {
      get: {
        tags: ['Wallet'],
        summary: 'Get wallet balance',
        description: 'Returns the current wallet balance and currency for the authenticated merchant.',
        security: [{ jwtAuth: [] }],
        responses: {
          '200': {
            description: 'Wallet balance',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    balance: { type: 'number', example: 1250.75 },
                    currency: { type: 'string', example: 'ILS' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/wallet/transactions': {
      get: {
        tags: ['Wallet'],
        summary: 'Get wallet transaction history',
        description: 'Returns a paginated list of wallet transactions (deposits, withdrawals, refund debits).',
        security: [{ jwtAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } },
        ],
        responses: {
          '200': {
            description: 'Wallet transactions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    transactions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          walletId: { type: 'string', format: 'uuid' },
                          type: { type: 'string', enum: ['deposit', 'withdrawal', 'refund_debit', 'adjustment'] },
                          amount: { type: 'number', example: 100.5 },
                          balanceAfter: { type: 'number', example: 1250.75 },
                          referenceType: { type: 'string', nullable: true },
                          referenceId: { type: 'string', nullable: true },
                          description: { type: 'string', nullable: true },
                          createdAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        limit: { type: 'integer' },
                        offset: { type: 'integer' },
                        total: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/wallet/withdraw': {
      post: {
        tags: ['Wallet'],
        summary: 'Withdraw from wallet',
        description: 'Withdraw funds from the merchant wallet. Fails if insufficient balance.',
        security: [{ jwtAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount'],
                properties: {
                  amount: { type: 'number', minimum: 0.01, maximum: 999999.99, example: 500.0 },
                  description: { type: 'string', maxLength: 255, example: 'Monthly withdrawal' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Withdrawal processed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    transaction: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        type: { type: 'string', example: 'withdrawal' },
                        amount: { type: 'number' },
                        balanceAfter: { type: 'number' },
                        description: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Insufficient balance', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Wallet not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
};

// ── Swagger UI HTML ─────────────────────────────────────────────────────
function getSwaggerHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SB0 Pay API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 30px 0; }
    .swagger-ui .info .title { font-size: 2rem; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/v1/docs/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.SwaggerUIStandalonePreset
      ],
      layout: 'BaseLayout',
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
      docExpansion: 'list',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
    });
  </script>
</body>
</html>`;
}

// ── Controller ──────────────────────────────────────────────────────────
export const docsController = new Elysia({ prefix: '/v1/docs' })
  .get('/', ({ set }) => {
    set.headers['content-type'] = 'text/html; charset=utf-8';
    return getSwaggerHtml();
  })
  .get('/openapi.json', () => OPENAPI_SPEC);
