import { Elysia } from 'elysia';

/**
 * API Documentation Controller
 * Provides basic API documentation and examples
 */
export const docsController = new Elysia({ prefix: '/docs' })
  
  // API Documentation
  .get('/', () => {
    return {
      title: 'SB0 Pay API Documentation',
      version: '1.2.0',
      description: 'Comprehensive payment processing API with line items, installments, language/currency overrides, and advanced AllPay features',
      baseUrl: '/api/v1',
      importantNotes: {
        amountFormat: 'All amounts are in decimal format (e.g., 342.60 for 342.60 ILS), NOT in minor units',
        lineItems: 'When using lineItems, the sum of (price × quantity) for all items must equal the total amount (±0.01 tolerance)',
        validation: 'URLs and emails are validated for format but allow flexibility for special characters'
      },
      authentication: {
        type: 'Bearer Token',
        description: 'Include your API key in the Authorization header',
        example: 'Authorization: Bearer sb0_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      },
      endpoints: {
        payments: {
          'POST /payments': {
            description: 'Create a new payment',
            permissions: ['payments:create'],
            body: {
              amount: 'number (required) - Amount in decimal format (e.g., 100.50 for 100.50 ILS)',
              currency: 'string (optional) - 3-letter currency code (defaults to merchant currency). Supported: ILS, USD, EUR',
              language: 'string (optional) - Payment page language (defaults to merchant language). Supported: he, en, ar, ru, auto',
              description: 'string (optional) - Payment description',
              lineItems: 'array (optional) - Array of line items for itemized payments. Sum of (price × quantity) must equal amount.',
              customerEmail: 'string (optional) - Customer email address',
              customerName: 'string (optional) - Customer name',
              customerPhone: 'string (optional) - Customer phone number',
              customerIdNumber: 'string (optional) - Customer ID number (Israeli tehudat zehut)',
              maxInstallments: 'number (optional) - Maximum installments (1-12)',
              fixedInstallments: 'boolean (optional) - Require exact installment count',
              expiresAt: 'string (optional) - ISO 8601 expiration timestamp',
              preauthorize: 'boolean (optional) - Authorize without capturing',
              showApplePay: 'boolean (optional) - Show Apple Pay option',
              showBit: 'boolean (optional) - Show Bit payment option',
              customField1: 'string (optional) - Custom field for merchant use',
              customField2: 'string (optional) - Custom field for merchant use',
              successUrl: 'string (optional) - URL to redirect after successful payment',
              cancelUrl: 'string (optional) - URL to redirect after cancelled payment',
              webhookUrl: 'string (optional) - URL to receive payment notifications',
              metadata: 'object (optional) - Custom metadata object'
            },
            response: {
              id: 'string - Payment ID',
              amount: 'number - Payment amount',
              currency: 'string - Currency code',
              status: 'string - Payment status',
              paymentUrl: 'string - URL for customer to complete payment',
              qrCodeDataUrl: 'string - QR code data URL for mobile payments',
              createdAt: 'string - ISO timestamp'
            }
          },
          'GET /payments/:id': {
            description: 'Get payment details',
            permissions: ['payments:read'],
            response: {
              id: 'string - Payment ID',
              amount: 'number - Payment amount',
              currency: 'string - Currency code',
              status: 'string - Payment status',
              description: 'string - Payment description',
              metadata: 'object - Custom metadata',
              createdAt: 'string - ISO timestamp',
              updatedAt: 'string - ISO timestamp'
            }
          },
          'GET /payments': {
            description: 'List payments with pagination',
            permissions: ['payments:read'],
            query: {
              limit: 'number (optional) - Number of results (max 100, default 50)',
              offset: 'number (optional) - Offset for pagination (default 0)'
            },
            response: {
              data: 'array - Array of payment objects',
              pagination: {
                limit: 'number - Results limit',
                offset: 'number - Results offset',
                total: 'number - Total count',
                hasMore: 'boolean - Whether more results exist'
              }
            }
          },
          'POST /payments/:id/refund': {
            description: 'Refund a completed payment',
            permissions: ['payments:update'],
            body: {
              amount: 'number (optional) - Partial refund amount (defaults to full amount)'
            },
            response: 'Payment object with updated status'
          },
          'POST /payments/:id/cancel': {
            description: 'Cancel a pending payment',
            permissions: ['payments:update'],
            response: 'Payment object with updated status'
          }
        }
      },
      errors: {
        authentication_error: {
          codes: ['MISSING_API_KEY', 'INVALID_API_KEY', 'INSUFFICIENT_PERMISSIONS'],
          description: 'Authentication or authorization failed'
        },
        invalid_request: {
          codes: ['INVALID_AMOUNT', 'PAYMENT_NOT_FOUND', 'INVALID_REFUND'],
          description: 'Request validation failed'
        },
        api_error: {
          codes: ['INTERNAL_ERROR', 'PAYMENT_PROVIDER_ERROR'],
          description: 'Server or external service error'
        },
        rate_limit_error: {
          codes: ['RATE_LIMIT_EXCEEDED'],
          description: 'API rate limit exceeded'
        }
      },
      examples: {
        createPayment: {
          request: {
            method: 'POST',
            url: '/api/v1/payments',
            headers: {
              'Authorization': 'Bearer sb0_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
              'Content-Type': 'application/json'
            },
            body: {
              amount: 250.00,
              currency: 'ILS',
              description: 'Order #12345',
              lineItems: [
                {
                  name: 'Product A',
                  price: 150.00,
                  quantity: 1,
                  includesVat: true
                },
                {
                  name: 'Product B',
                  price: 100.00,
                  quantity: 1,
                  includesVat: true
                }
              ],
              customerEmail: 'customer@example.com',
              customerName: 'John Doe',
              maxInstallments: 3,
              successUrl: 'https://yoursite.com/success',
              cancelUrl: 'https://yoursite.com/cancel',
              webhookUrl: 'https://yoursite.com/webhook',
              metadata: {
                orderId: '12345',
                customField: 'value'
              }
            }
          },
          response: {
            id: 'txn_1234567890abcdef',
            amount: 250.00,
            currency: 'ILS',
            status: 'pending',
            paymentUrl: 'https://pay.allpay.co.il/...',
            qrCodeDataUrl: 'data:image/png;base64,...',
            description: 'Order #12345',
            lineItems: [
              {
                name: 'Product A',
                price: 150.00,
                quantity: 1,
                includesVat: true
              },
              {
                name: 'Product B',
                price: 100.00,
                quantity: 1,
                includesVat: true
              }
            ],
            metadata: {
              orderId: '12345',
              customField: 'value'
            },
            createdAt: '2025-11-06T10:30:00Z'
          }
        },
        getPayment: {
          request: {
            method: 'GET',
            url: '/api/v1/payments/txn_1234567890abcdef',
            headers: {
              'Authorization': 'Bearer sb0_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
            }
          },
          response: {
            id: 'txn_1234567890abcdef',
            amount: 100.50,
            currency: 'ILS',
            status: 'completed',
            description: 'Order #12345',
            metadata: {
              orderId: '12345',
              customField: 'value'
            },
            createdAt: '2025-11-06T10:30:00Z',
            updatedAt: '2025-11-06T10:35:00Z'
          }
        }
      },
      sdks: {
        curl: {
          createPayment: `curl -X POST https://api.sb0pay.com/api/v1/payments \\
  -H "Authorization: Bearer sb0_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 250.00,
    "currency": "ILS",
    "description": "Order #12345",
    "lineItems": [
      {
        "name": "Product A",
        "price": 150.00,
        "quantity": 1,
        "includesVat": true
      },
      {
        "name": "Product B",
        "price": 100.00,
        "quantity": 1,
        "includesVat": true
      }
    ],
    "customerEmail": "customer@example.com",
    "maxInstallments": 3
  }'`
        },
        javascript: {
          createPayment: `const response = await fetch('https://api.sb0pay.com/api/v1/payments', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sb0_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 100.50,
    currency: 'ILS',
    description: 'Order #12345',
    customerEmail: 'customer@example.com'
  })
});

const payment = await response.json();`
        },
        python: {
          createPayment: `import requests

response = requests.post('https://api.sb0pay.com/api/v1/payments', 
  headers={
    'Authorization': 'Bearer sb0_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'Content-Type': 'application/json'
  },
  json={
    'amount': 100.50,
    'currency': 'ILS',
    'description': 'Order #12345',
    'customerEmail': 'customer@example.com'
  }
)

payment = response.json()`
        }
      }
    };
  })

  // OpenAPI/Swagger specification
  .get('/openapi.json', () => {
    return {
      openapi: '3.0.0',
      info: {
        title: 'SB0 Pay API',
        version: '1.1.0',
        description: 'Comprehensive payment processing API with line items, installments, and advanced AllPay features'
      },
      servers: [
        {
          url: '/api/v1',
          description: 'Production API'
        }
      ],
      security: [
        {
          bearerAuth: []
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'API Key'
          }
        },
        schemas: {
          Payment: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              amount: { type: 'number' },
              currency: { type: 'string' },
              status: { type: 'string' },
              paymentUrl: { type: 'string' },
              qrCodeDataUrl: { type: 'string' },
              description: { type: 'string' },
              metadata: { type: 'object' },
              createdAt: { type: 'string', format: 'date-time' }
            }
          },
          Error: {
            type: 'object',
            properties: {
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                  type: { type: 'string' }
                }
              },
              timestamp: { type: 'string', format: 'date-time' },
              requestId: { type: 'string' }
            }
          }
        }
      },
      paths: {
        '/payments': {
          post: {
            summary: 'Create payment',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['amount'],
                    properties: {
                      amount: { type: 'number', minimum: 0.01 },
                      currency: { type: 'string', pattern: '^[A-Z]{3}$', description: 'Currency code (ILS, USD, EUR)' },
                      language: { type: 'string', pattern: '^(he|en|ar|ru|auto)$', description: 'Payment page language' },
                      description: { type: 'string' },
                      lineItems: {
                        type: 'array',
                        items: {
                          type: 'object',
                          required: ['name', 'price', 'quantity'],
                          properties: {
                            name: { type: 'string' },
                            price: { type: 'number', minimum: 0 },
                            quantity: { type: 'number', minimum: 1 },
                            includesVat: { type: 'boolean' }
                          }
                        }
                      },
                      customerEmail: { type: 'string', format: 'email' },
                      customerName: { type: 'string' },
                      customerPhone: { type: 'string' },
                      customerIdNumber: { type: 'string' },
                      maxInstallments: { type: 'number', minimum: 1, maximum: 12 },
                      fixedInstallments: { type: 'boolean' },
                      expiresAt: { type: 'string', format: 'date-time' },
                      preauthorize: { type: 'boolean' },
                      showApplePay: { type: 'boolean' },
                      showBit: { type: 'boolean' },
                      customField1: { type: 'string' },
                      customField2: { type: 'string' },
                      successUrl: { type: 'string', format: 'uri' },
                      cancelUrl: { type: 'string', format: 'uri' },
                      webhookUrl: { type: 'string', format: 'uri' },
                      metadata: { type: 'object' }
                    }
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Payment created successfully',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Payment' }
                  }
                }
              },
              '400': {
                description: 'Invalid request',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Error' }
                  }
                }
              },
              '401': {
                description: 'Authentication failed',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Error' }
                  }
                }
              }
            }
          },
          get: {
            summary: 'List payments',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
              },
              {
                name: 'offset',
                in: 'query',
                schema: { type: 'integer', minimum: 0, default: 0 }
              }
            ],
            responses: {
              '200': {
                description: 'Payments retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Payment' }
                        },
                        pagination: {
                          type: 'object',
                          properties: {
                            limit: { type: 'integer' },
                            offset: { type: 'integer' },
                            total: { type: 'integer' },
                            hasMore: { type: 'boolean' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
  });