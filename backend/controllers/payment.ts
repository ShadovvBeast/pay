import { Elysia, t } from 'elysia';
import { paymentService } from '../services/payment.js';
import { authService } from '../services/auth.js';
import { userRepository } from '../services/repository.js';
import type { ErrorResponse } from '../types/index.js';

// Request/Response types
interface CreatePaymentRequest {
  amount: number;
  description?: string;
  customerEmail?: string;
}

interface PaymentResponse {
  transaction: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: Date;
  };
  paymentUrl: string;
  qrCodeDataUrl: string;
}

interface TransactionHistoryResponse {
  transactions: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

interface PaymentStatusResponse {
  transaction: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    paymentUrl: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Payment controller with Elysia routes
 */
export const paymentController = new Elysia({ prefix: '/payments' })
  
  // Create payment endpoint
  .post('/', async ({ body, headers, cookie, set }) => {
    try {
      // Manual authentication check (same as /me endpoint)
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

      console.log('Payment creation request - user:', validation.payload);
      const paymentData = body as CreatePaymentRequest;
      
      // Validate amount
      if (!paymentData.amount || paymentData.amount <= 0) {
        set.status = 400;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Amount must be a positive number'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        return errorResponse;
      }

      if (paymentData.amount > 999999.99) {
        set.status = 400;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'AMOUNT_TOO_LARGE',
            message: 'Amount exceeds maximum allowed value (999,999.99)'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        return errorResponse;
      }

      // Get user details for merchant configuration
      console.log('Looking up user with ID:', validation.payload.userId);
      const currentUser = await userRepository.findById(validation.payload.userId);
      console.log('Found user:', currentUser ? 'Yes' : 'No');
      
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

      // Create payment using the real AllPay service
      console.log('Creating payment with data:', paymentData);
      console.log('User merchant config:', currentUser.merchantConfig);
      
      const result = await paymentService.createPayment(currentUser, paymentData);
      
      console.log('Payment creation result:', result);

      set.status = 201;
      
      const response: PaymentResponse = {
        transaction: {
          id: result.transaction.id,
          amount: result.transaction.amount,
          currency: result.transaction.currency,
          status: result.transaction.status,
          createdAt: result.transaction.createdAt
        },
        paymentUrl: result.paymentUrl,
        qrCodeDataUrl: result.qrCodeDataUrl
      };

      return response;

    } catch (error) {
      console.error('Payment creation error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('Amount must be') || error.message.includes('Amount exceeds')) {
          set.status = 400;
          const errorResponse: ErrorResponse = {
            error: {
              code: 'VALIDATION_ERROR',
              message: error.message
            },
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          };
          return errorResponse;
        }
        
        if (error.message.includes('AllPay') || error.message.includes('API')) {
          set.status = 502;
          const errorResponse: ErrorResponse = {
            error: {
              code: 'PAYMENT_PROVIDER_ERROR',
              message: 'Payment provider is currently unavailable. Please try again later.'
            },
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          };
          return errorResponse;
        }
      }

      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create payment'
        },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      };
      return errorResponse;
    }
  }, {
    body: t.Object({
      amount: t.Number({ minimum: 0.01, maximum: 999999.99 }),
      description: t.Optional(t.String({ maxLength: 255 })),
      customerEmail: t.Optional(t.String({ format: 'email' }))
    })
  })

  // Get transaction details from AllPay endpoint
  .get('/:id/details', async ({ params, headers, cookie, set }) => {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Transaction details request started for transaction: ${params.id}`);
    
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
          requestId
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
          requestId
        };
      }

      const transactionId = params.id;
      console.log(`[${requestId}] Transaction ID: ${transactionId}`);
      
      if (!transactionId) {
        console.log(`[${requestId}] Missing transaction ID`);
        set.status = 400;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'MISSING_TRANSACTION_ID',
            message: 'Transaction ID is required'
          },
          timestamp: new Date().toISOString(),
          requestId
        };
        return errorResponse;
      }

      console.log(`[${requestId}] Getting transaction details...`);
      // Get transaction details from AllPay
      const details = await paymentService.getTransactionDetails(transactionId, validation.payload.userId);
      console.log(`[${requestId}] Got transaction details:`, details);

      console.log(`[${requestId}] Transaction details request completed successfully`);
      return details;

    } catch (error) {
      console.error(`[${requestId}] Transaction details error:`, error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        console.log(`[${requestId}] Transaction not found error`);
        set.status = 404;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'TRANSACTION_NOT_FOUND',
            message: 'Transaction not found'
          },
          timestamp: new Date().toISOString(),
          requestId
        };
        return errorResponse;
      }

      if (error instanceof Error && error.message.includes('Unauthorized')) {
        console.log(`[${requestId}] Access denied error`);
        set.status = 403;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to this transaction'
          },
          timestamp: new Date().toISOString(),
          requestId
        };
        return errorResponse;
      }

      console.log(`[${requestId}] Internal server error`);
      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get transaction details'
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

  // Get payment status endpoint
  .get('/:id/status', async ({ params, headers, cookie, set }) => {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Payment status request started for transaction: ${params.id}`);
    
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
          requestId
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
          requestId
        };
      }

      const transactionId = params.id;
      console.log(`[${requestId}] Transaction ID: ${transactionId}`);
      console.log(`[${requestId}] User object:`, validation.payload);
      
      if (!transactionId) {
        console.log(`[${requestId}] Missing transaction ID`);
        set.status = 400;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'MISSING_TRANSACTION_ID',
            message: 'Transaction ID is required'
          },
          timestamp: new Date().toISOString(),
          requestId
        };
        return errorResponse;
      }

      console.log(`[${requestId}] Calling paymentService.getPaymentStatus...`);
      // Get payment status
      const transaction = await paymentService.getPaymentStatus(transactionId);
      console.log(`[${requestId}] Got transaction from service:`, transaction);
      
      // Verify the transaction belongs to the authenticated user
      console.log(`[${requestId}] Checking ownership: transaction.userId=${transaction.userId}, user.userId=${validation.payload.userId}`);
      if (transaction.userId !== validation.payload.userId) {
        console.log(`[${requestId}] Access denied - user mismatch`);
        set.status = 403;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to this transaction'
          },
          timestamp: new Date().toISOString(),
          requestId
        };
        return errorResponse;
      }

      console.log(`[${requestId}] Building response...`);
      const response: PaymentStatusResponse = {
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          paymentUrl: transaction.paymentUrl,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt
        }
      };

      console.log(`[${requestId}] Payment status request completed successfully`);
      return response;

    } catch (error) {
      console.error(`[${requestId}] Payment status error:`, error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        console.log(`[${requestId}] Transaction not found error`);
        set.status = 404;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'TRANSACTION_NOT_FOUND',
            message: 'Transaction not found'
          },
          timestamp: new Date().toISOString(),
          requestId
        };
        return errorResponse;
      }

      console.log(`[${requestId}] Internal server error`);
      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get payment status'
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

  // Get transaction history endpoint
  .get('/history', async ({ query, headers, cookie, set }) => {
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

      const limit = Math.min(parseInt(query.limit as string) || 50, 100); // Max 100 items
      const offset = Math.max(parseInt(query.offset as string) || 0, 0);
      
      // Get transaction history
      const transactions = await paymentService.getTransactionHistory(validation.payload.userId, limit, offset);
      
      // Get total count for pagination
      const totalCount = await paymentService.getTransactionCount(validation.payload.userId);

      const response: TransactionHistoryResponse = {
        transactions: transactions.map(transaction => ({
          id: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt
        })),
        pagination: {
          limit,
          offset,
          total: totalCount
        }
      };

      return response;

    } catch (error) {
      console.error('Transaction history error:', error);
      
      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve transaction history'
        },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      };
      return errorResponse;
    }
  }, {
    query: t.Object({
      limit: t.Optional(t.String({ pattern: '^[0-9]+$' })),
      offset: t.Optional(t.String({ pattern: '^[0-9]+$' }))
    })
  })

  // Refund payment endpoint
  .post('/:id/refund', async ({ params, body, headers, cookie, set }) => {
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

      const transactionId = params.id;
      const refundData = body as { amount?: number };
      
      if (!transactionId) {
        set.status = 400;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'MISSING_TRANSACTION_ID',
            message: 'Transaction ID is required'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        return errorResponse;
      }

      // Process refund
      const transaction = await paymentService.refundPayment(
        transactionId, 
        validation.payload.userId,
        refundData.amount
      );

      const response: PaymentStatusResponse = {
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          paymentUrl: transaction.paymentUrl,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt
        }
      };

      return response;

    } catch (error) {
      console.error('Payment refund error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          set.status = 404;
          const errorResponse: ErrorResponse = {
            error: {
              code: 'TRANSACTION_NOT_FOUND',
              message: 'Transaction not found'
            },
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          };
          return errorResponse;
        }
        
        if (error.message.includes('Unauthorized')) {
          set.status = 403;
          const errorResponse: ErrorResponse = {
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied to this transaction'
            },
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          };
          return errorResponse;
        }
        
        if (error.message.includes('Can only refund') || error.message.includes('Invalid refund amount')) {
          set.status = 400;
          const errorResponse: ErrorResponse = {
            error: {
              code: 'INVALID_REFUND',
              message: error.message
            },
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          };
          return errorResponse;
        }
      }

      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process refund'
        },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
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

  // Cancel payment endpoint
  .post('/:id/cancel', async ({ params, headers, cookie, set }) => {
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

      const transactionId = params.id;
      
      if (!transactionId) {
        set.status = 400;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'MISSING_TRANSACTION_ID',
            message: 'Transaction ID is required'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        return errorResponse;
      }

      // Cancel payment
      const transaction = await paymentService.cancelPayment(transactionId, validation.payload.userId);

      const response: PaymentStatusResponse = {
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          paymentUrl: transaction.paymentUrl,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt
        }
      };

      return response;

    } catch (error) {
      console.error('Payment cancellation error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          set.status = 404;
          const errorResponse: ErrorResponse = {
            error: {
              code: 'TRANSACTION_NOT_FOUND',
              message: 'Transaction not found'
            },
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          };
          return errorResponse;
        }
        
        if (error.message.includes('Unauthorized')) {
          set.status = 403;
          const errorResponse: ErrorResponse = {
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied to this transaction'
            },
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          };
          return errorResponse;
        }
        
        if (error.message.includes('Can only cancel')) {
          set.status = 400;
          const errorResponse: ErrorResponse = {
            error: {
              code: 'INVALID_STATUS',
              message: error.message
            },
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          };
          return errorResponse;
        }
      }

      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cancel payment'
        },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      };
      return errorResponse;
    }
  }, {
    params: t.Object({
      id: t.String({ minLength: 1 })
    })
  })

  // Remove auth requirement for webhook endpoint
  .group('', (app) => app
    // Webhook endpoint for AllPay notifications (no auth required)
    .post('/webhook', async ({ body, headers, set }) => {
    try {
      const webhookPayload = body as any;
      const signature = headers['x-allpay-signature'] || headers['signature'];
      
      if (!webhookPayload) {
        set.status = 400;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'MISSING_PAYLOAD',
            message: 'Webhook payload is required'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        return errorResponse;
      }

      // Process webhook
      const result = await paymentService.processWebhook(webhookPayload, signature || '');
      
      if (!result.success) {
        set.status = 400;
        const errorResponse: ErrorResponse = {
          error: {
            code: 'WEBHOOK_PROCESSING_FAILED',
            message: result.error || 'Failed to process webhook'
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        return errorResponse;
      }

      return {
        success: true,
        transactionId: result.transactionId,
        message: 'Webhook processed successfully'
      };

    } catch (error) {
      console.error('Webhook processing error:', error);
      
      set.status = 500;
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process webhook'
        },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      };
      return errorResponse;
    }
  }, {
    body: t.Any()
  })
  );