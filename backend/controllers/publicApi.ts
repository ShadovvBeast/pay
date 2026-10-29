import { Elysia, t } from 'elysia';
import { apiKeyAuth, logApiUsage } from '../middleware/apiAuth.js';
import { paymentService } from '../services/payment.js';
import { regionalCurrency } from '../services/regionalCurrency.js';
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

  // SB0S Galaxy fixed-price pre-order checkout.
  // This route is the only permission granted to the SB0S browser (publishable) key.
  // Prices, description, return URLs, provider callback, and currency routing are
  // all fixed server-side here — the client only chooses country + plan.
  .use(apiKeyAuth('galaxy', 'checkout'))
  .post('/galaxy/checkout', async ({ body, apiKey, requestId, set }) => {
    const key = apiKey as ApiKey;
    const input = body as { country?: string; plan?: string; termsAccepted?: boolean; privacyAccepted?: boolean; termsVersion?: string; privacyVersion?: string };
    if (!key?.userId || !key.publicCheckoutOnly) {
      set.status = 403;
      return { error: { code: 'FORBIDDEN', message: 'This key cannot create Galaxy checkout sessions.', type: 'authentication_error' }, timestamp: new Date().toISOString(), requestId };
    }
    if (!input.termsAccepted || !input.privacyAccepted || input.termsVersion !== 'galaxy-preorder-2026-09-27' || input.privacyVersion !== 'sb0s-privacy-2026-09-27') {
      set.status = 400;
      return { error: { code: 'CONSENT_REQUIRED', message: 'Accept the current pre-order terms and privacy notice to continue.', type: 'invalid_request' }, timestamp: new Date().toISOString(), requestId };
    }
    if (!['IL', 'UG', 'IN', 'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'AE'].includes(input.country || '') && !/^[A-Z]{2}$/.test(input.country || '')) {
      set.status = 400;
      return { error: { code: 'INVALID_COUNTRY', message: 'Choose a valid country to see the applicable price.', type: 'invalid_request' }, timestamp: new Date().toISOString(), requestId };
    }
    if (input.plan !== 'monthly' && input.plan !== 'annual') {
      set.status = 400;
      return { error: { code: 'INVALID_PLAN', message: 'Choose a monthly or annual one-time licence.', type: 'invalid_request' }, timestamp: new Date().toISOString(), requestId };
    }

    const currency = regionalCurrency(input.country!);
    const prices = currency === 'ILS' ? { monthly: 60, annual: 600 } : { monthly: 80000, annual: 800000 };
    const amount = prices[input.plan];
    const merchant = await userRepository.findById(key.userId);
    if (!merchant) {
      set.status = 404;
      return { error: { code: 'MERCHANT_NOT_FOUND', message: 'SB0 Pay merchant configuration is unavailable.', type: 'api_error' }, timestamp: new Date().toISOString(), requestId };
    }

    try {
      const result = await paymentService.createPayment(merchant, {
        amount,
        currency,
        customerCountry: input.country,
        language: input.country === 'IL' ? 'he' : 'en',
        description: `SB0S Galaxy ${input.plan === 'annual' ? '12-month' : '1-month'} pre-order licence`,
        paymentMethod: 'card',
        lineItems: [{ name: `SB0S Galaxy ${input.plan === 'annual' ? '12-month' : '1-month'} pre-order licence`, price: amount, quantity: 1, includesVat: true }],
        checkoutConsent: {
          accepted: true,
          termsVersion: input.termsVersion,
          privacyVersion: input.privacyVersion,
          productSchedule: { product: 'SB0S Galaxy', plan: input.plan, oneTimePayment: true, automaticRenewal: false, releaseTarget: 'mid-October 2026 estimate' },
        },
        successUrl: 'https://sb0s.com/galaxy/confirmed/',
        cancelUrl: 'https://sb0s.com/galaxy/#preorder',
        webhookUrl: `${process.env.BACKEND_URL || 'https://sb0pay-678576192331.us-central1.run.app'}/payments/webhook`,
        metadata: { product: 'sb0s-galaxy', plan: input.plan, country: input.country },
      }, key.id);
      set.status = 201;
      return { id: result.transaction.id, paymentUrl: result.paymentUrl, amount, currency, plan: input.plan, provider: 'sb0-pay', next: 'allpay-hosted-checkout' };
    } catch (error) {
      console.error('Galaxy checkout creation failed', error instanceof Error ? error.message : 'unknown');
      set.status = 502;
      return { error: { code: 'CHECKOUT_UNAVAILABLE', message: 'Secure checkout could not be started. Please try again shortly.', type: 'api_error' }, timestamp: new Date().toISOString(), requestId };
    }
  })

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

      // Enforce payment method restriction
      const requestedMethod: string = paymentData.paymentMethod || 'card';
      const keyMethod = authApiKey.paymentMethod || 'card';

      if (keyMethod === 'card' && (requestedMethod === 'mobile_money' || requestedMethod === 'mtn_momo' || requestedMethod === 'airtel_money' || requestedMethod === 'mpesa')) {
        set.status = 403;
        const errorResponse: PublicErrorResponse = {
          error: {
            code: 'PAYMENT_METHOD_NOT_ALLOWED',
            message: 'This API key is restricted to card payments only. Create a mobile_money key to process mobile money payments.',
            type: 'authentication_error'
          },
          timestamp: new Date().toISOString(),
          requestId
        };
        return errorResponse;
      }

      if (keyMethod === 'mobile_money' && (requestedMethod === 'card' || !requestedMethod)) {
        set.status = 403;
        const errorResponse: PublicErrorResponse = {
          error: {
            code: 'PAYMENT_METHOD_NOT_ALLOWED',
            message: 'This API key is restricted to mobile money payments only. Create a card key to process card payments.',
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

      // Use user's currency if not specified. When a customerCountry is given,
      // route the currency regionally (IL => ILS, else UGX).
      const currency = paymentData.currency || (paymentData.customerCountry
        ? regionalCurrency(paymentData.customerCountry)
        : currentUser.merchantConfig.currency);
      
      // Use user's language if not specified
      const language = paymentData.language || currentUser.merchantConfig.language;

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
        customerCountry: paymentData.customerCountry,
        checkoutConsent: paymentData.checkoutConsent,
        currency: currency,
        language: language,
        description: paymentData.description,
        paymentMethod: paymentData.paymentMethod || 'auto',
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
        paymentMethod: result.transaction.paymentMethod || 'card',
        paymentProvider: result.transaction.paymentProvider || 'allpay',
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
        if (/^(Invalid |Unsupported card currency)/.test(error.message)) {
          set.status = 400;
          return { error: { code: 'INVALID_PAYMENT_CONFIGURATION', message: error.message, type: 'invalid_request' }, timestamp: new Date().toISOString(), requestId };
        }
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
      customerCountry: t.Optional(t.String({ pattern: '^[A-Z]{2}$' })),
      checkoutConsent: t.Optional(t.Object({
        accepted: t.Literal(true),
        termsVersion: t.String({ minLength: 1, maxLength: 100 }),
        privacyVersion: t.String({ minLength: 1, maxLength: 100 }),
        productSchedule: t.Record(t.String(), t.Unknown())
      })),
      language: t.Optional(t.String({ pattern: '^(he|en|ar|ru|auto)$' })),
      description: t.Optional(t.String({ maxLength: 255 })),
      paymentMethod: t.Optional(t.String({ pattern: '^(card|mobile_money|auto)$' })),
      lineItems: t.Optional(t.Array(t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        price: t.Number({ minimum: 0 }),
        quantity: t.Number({ minimum: 1 }),
        includesVat: t.Optional(t.Boolean())
      }))),
      customerEmail: t.Optional(t.String({ maxLength: 320 })), // RFC 5321 max email length
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
      successUrl: t.Optional(t.String({ maxLength: 2048 })), // Changed from format: 'uri' to maxLength
      cancelUrl: t.Optional(t.String({ maxLength: 2048 })), // Changed from format: 'uri' to maxLength
      webhookUrl: t.Optional(t.String({ maxLength: 2048 })), // Changed from format: 'uri' to maxLength
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