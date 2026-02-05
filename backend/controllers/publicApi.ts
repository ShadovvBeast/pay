import { Elysia, t } from 'elysia';
import { apiKeyAuth, logApiUsage } from '../middleware/apiAuth.js';
import { paymentService } from '../services/payment.js';
import { userRepository } from '../services/repository.js';
import type { 
  PublicCreatePaymentRequest,
  PublicPaymentResponse,
  PublicTransactionResponse,
  PublicErrorResponse,
  ApiKey
} from '../types/index.js';

/**
 * Public API Controller
 * Handles API key authenticated requests for external integrations
 */
export const publicApiController = new Elysia({ prefix: '/v1' })
  .use(logApiUsage)

  // Create payment endpoint
  .use(apiKeyAuth('payments', 'create'))
  .post('/payments', async ({ body, apiKey, requestId, set }) => {
    try {
      const paymentData = body as PublicCreatePaymentRequest;
      const authApiKey = apiKey as ApiKey;
      
      // Validate API key is properly set
      if (!authApiKey || !authApiKey.userId) {
        set.status = 401;
        const errorResponse: PublicErrorResponse = {
          error: {
            code: 'INVALID_API_KEY',
            message: 'API key authentication failed',
            type: 'authentication_error'
          },
          timestamp: new Date().toISOString(),
          requestId
        };
        return errorResponse;
      }
      
      // Get user details for merchant configuration
      const currentUser = await userRepository.findById(authApiKey.userId);
      
      if (!currentUser) {
        set.status = 404;
        const errorResponse: PublicErrorResponse = {
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Associated user account not found',
            type: 'api_error'
          },
          timestamp: new Date().toISOString(),
          requestId
        };
        return errorResponse;
      }

      // Use user's currency if not specified
      const currency = paymentData.currency || currentUser.merchantConfig.currency;

      // Parse expiresAt if provided
      let expiresAt: Date | undefined;
      if (paymentData.expiresAt) {
        expiresAt = new Date(paymentData.expiresAt);
        if (isNaN(expiresAt.getTime())) {
          set.status = 400;
          const errorResponse: PublicErrorResponse = {
            error: {
              code: 'INVALID_EXPIRATION',
              message: 'Invalid expiration date format. Use ISO 8601 format.',
              type: 'invalid_request'
            },
            timestamp: new Date().toISOString(),
            requestId
          };
          return errorResponse;
        }
        
        // Ensure expiration is in the future
        if (expiresAt <= new Date()) {
          set.status = 400;
          const errorResponse: PublicErrorResponse = {
            error: {
              code: 'INVALID_EXPIRATION',
              message: 'Expiration date must be in the future',
              type: 'invalid_request'
            },
            timestamp: new Date().toISOString(),
            requestId
          };
          return errorResponse;
        }
      }

      // Validate line items if provided
      if (paymentData.lineItems && paymentData.lineItems.length > 0) {
        const totalLineItemsAmount = paymentData.lineItems.reduce(
          (sum, item) => sum + (item.price * item.quantity), 
          0
        );
        
        // Allow small rounding differences (1 cent)
        if (Math.abs(totalLineItemsAmount - paymentData.amount) > 0.01) {
          set.status = 400;
          const errorResponse: PublicErrorResponse = {
            error: {
              code: 'INVALID_LINE_ITEMS',
              message: `Line items total (${totalLineItemsAmount.toFixed(2)}) must match payment amount (${paymentData.amount.toFixed(2)})`,
              type: 'invalid_request'
            },
            timestamp: new Date().toISOString(),
            requestId
          };
          return errorResponse;
        }
      }

      // Create enhanced payment data
      const enhancedPaymentData = {
        amount: paymentData.amount,
        description: paymentData.description,
        lineItems: paymentData.lineItems,
        customerEmail: paymentData.customerEmail,
        customerName: paymentData.customerName,
        customerPhone: paymentData.customerPhone,
        customerIdNumber: paymentData.customerIdNumber,
        maxInstallments: paymentData.maxInstallments,
        fixedInstallments: paymentData.fixedInstallments,
        expiresAt: expiresAt,
        preauthorize: paymentData.preauthorize,
        showApplePay: paymentData.showApplePay,
        showBit: paymentData.showBit,
        customField1: paymentData.customField1,
        customField2: paymentData.customField2,
        successUrl: paymentData.successUrl,
        cancelUrl: paymentData.cancelUrl,
        webhookUrl: paymentData.webhookUrl,
        metadata: paymentData.metadata
      };

      // Create payment using the payment service
      const result = await paymentService.createPayment(currentUser, enhancedPaymentData, authApiKey.id);

      set.status = 201;
      
      const response: PublicPaymentResponse = {
        id: result.transaction.id,
        amount: result.transaction.amount,
        currency: result.transaction.currency,
        status: result.transaction.status,
        paymentUrl: result.paymentUrl,
        qrCodeDataUrl: result.qrCodeDataUrl,
        description: paymentData.description,
        lineItems: paymentData.lineItems,
        expiresAt: expiresAt?.toISOString(),
        metadata: paymentData.metadata,
        createdAt: result.transaction.createdAt.toISOString()
      };

      return response;

    } catch (error) {
      console.error('Public API payment creation error:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('Amount must be') || error.message.includes('Amount exceeds')) {
          set.status = 400;
          const errorResponse: PublicErrorResponse = {
            error: {
              code: 'INVALID_AMOUNT',
              message: error.message,
              type: 'invalid_request'
            },
            timestamp: new Date().toISOString(),
            requestId
          };
          return errorResponse;
        }
        
        if (error.message.includes('AllPay') || error.message.includes('API')) {
          set.status = 502;
          const errorResponse: PublicErrorResponse = {
            error: {
              code: 'PAYMENT_PROVIDER_ERROR',
              message: 'Payment provider is currently unavailable. Please try again later.',
              type: 'api_error'
            },
            timestamp: new Date().toISOString(),
            requestId
          };
          return errorResponse;
        }
      }

      set.status = 500;
      const errorResponse: PublicErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create payment',
          type: 'api_error'
        },
        timestamp: new Date().toISOString(),
        requestId
      };
      return errorResponse;
    }
  }, {
    body: t.Object({
      amount: t.Number({ minimum: 0.01, maximum: 999999.99 }),
      currency: t.Optional(t.String({ pattern: '^[A-Z]{3}$' })),
      description: t.Optional(t.String({ maxLength: 255 })),
      lineItems: t.Optional(t.Array(t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        price: t.Number({ minimum: 0 }),
        quantity: t.Number({ minimum: 1 }),
        includesVat: t.Optional(t.Boolean())
      }))),
      customerEmail: t.Optional(t.String({ format: 'email' })),
      customerName: t.Optional(t.String({ maxLength: 255 })),
      customerPhone: t.Optional(t.String({ maxLength: 50 })),
      customerIdNumber: t.Optional(t.String({ maxLength: 20 })),
      maxInstallments: t.Optional(t.Number({ minimum: 1, maximum: 12 })),
      fixedInstallments: t.Optional(t.Boolean()),
      expiresAt: t.Optional(t.String()),
      preauthorize: t.Optional(t.Boolean()),
      showApplePay: t.Optional(t.Boolean()),
      showBit: t.Optional(t.Boolean()),
      customField1: t.Optional(t.String({ maxLength: 255 })),
      customField2: t.Optional(t.String({ maxLength: 255 })),
      successUrl: t.Optional(t.String({ format: 'uri' })),
      cancelUrl: t.Optional(t.String({ format: 'uri' })),
      webhookUrl: t.Optional(t.String({ format: 'uri' })),
      metadata: t.Optional(t.Record(t.String(), t.Any()))
    })
  })

  // Get payment details
  .use(apiKeyAuth('payments', 'read'))
  .get('/payments/:id', async ({ params, apiKey, requestId, set }) => {
    try {
      const authApiKey = apiKey as ApiKey;
      const paymentId = params.id;

      // Validate API key is properly set
      if (!authApiKey || !authApiKey.userId) {
        set.status = 401;
        const errorResponse: PublicErrorResponse = {
          error: {
            code: 'INVALID_API_KEY',
            message: 'API key authentication failed',
            type: 'authentication_error'
          },
          timestamp: new Date().toISOString(),
          requestId
        };
        return errorResponse;
      }

      // Get payment details and verify ownership
      const transaction = await paymentService.getPaymentStatus(paymentId);
      
      // Verify the transaction belongs to the API key's user
      if (transaction.userId !== authApiKey.userId) {
        set.status = 403;
        const errorResponse: PublicErrorResponse = {
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to this payment',
            type: 'authentication_error'
          },
          timestamp: new Date().toISOString(),
          requestId
        };
        return errorResponse;
      }

      const response: PublicTransactionResponse = {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        description: transaction.description,
        metadata: transaction.metadata,
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString()
      };

      return response;

    } catch (error) {
      console.error('Public API get payment error:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        set.status = 404;
        const errorResponse: PublicErrorResponse = {
          error: {
            code: 'PAYMENT_NOT_FOUND',
            message: 'Payment not found',
            type: 'invalid_request'
          },
          timestamp: new Date().toISOString(),
          requestId
        };
        return errorResponse;
      }

      set.status = 500;
      const errorResponse: PublicErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve payment',
          type: 'api_error'
        },
        timestamp: new Date().toISOString(),
        requestId
      };
      return errorResponse;
    }
  }, {
    params: t.Object({
      id: t.String({ minLength: 1 })
    })
  })

  // List payments with pagination
  .use(apiKeyAuth('payments', 'read'))
  .get('/payments', async ({ query, apiKey, requestId, set }) => {
    try {
      const authApiKey = apiKey as ApiKey;
      
      // Validate API key is properly set
      if (!authApiKey || !authApiKey.userId) {
        set.status = 401;
        const errorResponse: PublicErrorResponse = {
          error: {
            code: 'INVALID_API_KEY',
            message: 'API key authentication failed',
            type: 'authentication_error'
          },
          timestamp: new Date().toISOString(),
          requestId
        };
        return errorResponse;
      }
      
      const limit = Math.min(parseInt(query.limit as string) || 50, 100);
      const offset = Math.max(parseInt(query.offset as string) || 0, 0);
      
      // Get transaction history for the API key's user
      const transactions = await paymentService.getTransactionHistory(authApiKey.userId, limit, offset);
      const totalCount = await paymentService.getTransactionCount(authApiKey.userId);

      const response = {
        data: transactions.map(transaction => ({
          id: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          description: transaction.description,
          metadata: transaction.metadata,
          createdAt: transaction.createdAt.toISOString(),
          updatedAt: transaction.updatedAt.toISOString()
        })),
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + limit < totalCount
        }
      };

      return response;

    } catch (error) {
      console.error('Public API list payments error:', error);
      
      set.status = 500;
      const errorResponse: PublicErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve payments',
          type: 'api_error'
        },
        timestamp: new Date().toISOString(),
        requestId
      };
      return errorResponse;
    }
  }, {
    query: t.Object({
      limit: t.Optional(t.String({ pattern: '^[0-9]+$' })),
      offset: t.Optional(t.String({ pattern: '^[0-9]+$' }))
    })
  })

  // Refund payment
  .use(apiKeyAuth('payments', 'update'))
  .post('/payments/:id/refund', async ({ params, body, apiKey, requestId, set }) => {
    try {
      const authApiKey = apiKey as ApiKey;
      const paymentId = params.id;
      const refundData = body as { amount?: number };

      // Validate API key is properly set
      if (!authApiKey || !authApiKey.userId) {
        set.status = 401;
        const errorResponse: PublicErrorResponse = {
          error: {
            code: 'INVALID_API_KEY',
            message: 'API key authentication failed',
            type: 'authentication_error'
          },
          timestamp: new Date().toISOString(),
          requestId
        };
        return errorResponse;
      }

      // Process refund
      const transaction = await paymentService.refundPayment(
        paymentId,
        authApiKey.userId,
        refundData.amount
      );

      const response: PublicTransactionResponse = {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        description: transaction.description,
        metadata: transaction.metadata,
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString()
      };

      return response;

    } catch (error) {
      console.error('Public API refund error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          set.status = 404;
          const errorResponse: PublicErrorResponse = {
            error: {
              code: 'PAYMENT_NOT_FOUND',
              message: 'Payment not found',
              type: 'invalid_request'
            },
            timestamp: new Date().toISOString(),
            requestId
          };
          return errorResponse;
        }
        
        if (error.message.includes('Unauthorized')) {
          set.status = 403;
          const errorResponse: PublicErrorResponse = {
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied to this payment',
              type: 'authentication_error'
            },
            timestamp: new Date().toISOString(),
            requestId
          };
          return errorResponse;
        }
        
        if (error.message.includes('Can only refund') || error.message.includes('Invalid refund amount')) {
          set.status = 400;
          const errorResponse: PublicErrorResponse = {
            error: {
              code: 'INVALID_REFUND',
              message: error.message,
              type: 'invalid_request'
            },
            timestamp: new Date().toISOString(),
            requestId
          };
          return errorResponse;
        }
      }

      set.status = 500;
      const errorResponse: PublicErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process refund',
          type: 'api_error'
        },
        timestamp: new Date().toISOString(),
        requestId
      };
      return errorResponse;
    }
  }, {
    params: t.Object({
      id: t.String({ minLength: 1 })
    }),
    body: t.Object({
      amount: t.Optional(t.Number({ minimum: 0.01 }))
    })
  })

  // Cancel payment
  .use(apiKeyAuth('payments', 'update'))
  .post('/payments/:id/cancel', async ({ params, apiKey, requestId, set }) => {
    try {
      const authApiKey = apiKey as ApiKey;
      const paymentId = params.id;

      // Validate API key is properly set
      if (!authApiKey || !authApiKey.userId) {
        set.status = 401;
        const errorResponse: PublicErrorResponse = {
          error: {
            code: 'INVALID_API_KEY',
            message: 'API key authentication failed',
            type: 'authentication_error'
          },
          timestamp: new Date().toISOString(),
          requestId
        };
        return errorResponse;
      }

      // Cancel payment
      const transaction = await paymentService.cancelPayment(paymentId, authApiKey.userId);

      const response: PublicTransactionResponse = {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        description: transaction.description,
        metadata: transaction.metadata,
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString()
      };

      return response;

    } catch (error) {
      console.error('Public API cancel error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          set.status = 404;
          const errorResponse: PublicErrorResponse = {
            error: {
              code: 'PAYMENT_NOT_FOUND',
              message: 'Payment not found',
              type: 'invalid_request'
            },
            timestamp: new Date().toISOString(),
            requestId
          };
          return errorResponse;
        }
        
        if (error.message.includes('Unauthorized')) {
          set.status = 403;
          const errorResponse: PublicErrorResponse = {
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied to this payment',
              type: 'authentication_error'
            },
            timestamp: new Date().toISOString(),
            requestId
          };
          return errorResponse;
        }
        
        if (error.message.includes('Can only cancel')) {
          set.status = 400;
          const errorResponse: PublicErrorResponse = {
            error: {
              code: 'INVALID_STATUS',
              message: error.message,
              type: 'invalid_request'
            },
            timestamp: new Date().toISOString(),
            requestId
          };
          return errorResponse;
        }
      }

      set.status = 500;
      const errorResponse: PublicErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cancel payment',
          type: 'api_error'
        },
        timestamp: new Date().toISOString(),
        requestId
      };
      return errorResponse;
    }
  }, {
    params: t.Object({
      id: t.String({ minLength: 1 })
    })
  });