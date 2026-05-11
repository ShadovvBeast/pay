import { Elysia, t } from 'elysia';
import { authService } from '../services/auth.js';
import { walletService } from '../services/wallet.js';
import type { ErrorResponse } from '../types/index.js';

/**
 * Wallet Controller
 * Handles wallet balance, deposit history, and withdrawal requests.
 * All endpoints require JWT authentication.
 */
export const walletController = new Elysia({ prefix: '/wallet' })

  // Get wallet balance (includes walletId)
  .get('/balance', async ({ headers, cookie, set }) => {
    try {
      const token = extractToken(headers, cookie);
      if (!token) return unauthorized(set);

      const validation = await authService.validateAccessToken(token);
      if (!validation.isValid || !validation.payload) return unauthorized(set);

      const wallet = await walletService.getOrCreateWallet(validation.payload.userId);

      return { balance: wallet.balance, currency: wallet.currency, walletId: wallet.walletId };
    } catch (error) {
      console.error('Wallet balance error:', error);
      return internalError(set, 'Failed to retrieve wallet balance');
    }
  })

  // Look up a wallet by its public wallet ID (for transfer confirmation)
  .get('/lookup/:walletId', async ({ params, headers, cookie, set }) => {
    try {
      const token = extractToken(headers, cookie);
      if (!token) return unauthorized(set);

      const validation = await authService.validateAccessToken(token);
      if (!validation.isValid || !validation.payload) return unauthorized(set);

      const result = await walletService.lookupByWalletId(params.walletId);

      if (!result) {
        set.status = 404;
        return {
          error: { code: 'WALLET_NOT_FOUND', message: 'No wallet found with that ID' },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        };
      }

      return result;
    } catch (error) {
      console.error('Wallet lookup error:', error);
      return internalError(set, 'Failed to look up wallet');
    }
  }, {
    params: t.Object({
      walletId: t.String({ minLength: 20, maxLength: 20 })
    })
  })

  // Transfer to another wallet
  .post('/transfer', async ({ body, headers, cookie, set }) => {
    try {
      const token = extractToken(headers, cookie);
      if (!token) return unauthorized(set);

      const validation = await authService.validateAccessToken(token);
      if (!validation.isValid || !validation.payload) return unauthorized(set);

      const { toWalletId, amount, description } = body as { toWalletId: string; amount: number; description?: string };

      const { senderTx } = await walletService.transfer(
        validation.payload.userId,
        toWalletId,
        amount,
        description
      );

      return {
        message: 'Transfer completed successfully',
        transaction: senderTx,
      };
    } catch (error) {
      console.error('Wallet transfer error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Insufficient balance')) {
          set.status = 400;
          return {
            error: { code: 'INSUFFICIENT_BALANCE', message: error.message },
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          };
        }
        if (error.message.includes('not found')) {
          set.status = 404;
          return {
            error: { code: 'WALLET_NOT_FOUND', message: error.message },
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          };
        }
        if (error.message.includes('Cannot transfer to your own')) {
          set.status = 400;
          return {
            error: { code: 'SELF_TRANSFER', message: error.message },
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          };
        }
      }

      return internalError(set, 'Failed to process transfer');
    }
  }, {
    body: t.Object({
      toWalletId: t.String({ minLength: 20, maxLength: 20 }),
      amount: t.Number({ minimum: 0.01, maximum: 999999.99 }),
      description: t.Optional(t.String({ maxLength: 255 })),
    }),
  })

  // Get wallet transaction history
  .get('/transactions', async ({ query, headers, cookie, set }) => {
    try {
      const token = extractToken(headers, cookie);
      if (!token) return unauthorized(set);

      const validation = await authService.validateAccessToken(token);
      if (!validation.isValid || !validation.payload) return unauthorized(set);

      const limit = Math.min(parseInt(query.limit as string) || 50, 100);
      const offset = Math.max(parseInt(query.offset as string) || 0, 0);

      const { transactions, total } = await walletService.getTransactions(
        validation.payload.userId,
        limit,
        offset
      );

      return {
        transactions,
        pagination: { limit, offset, total },
      };
    } catch (error) {
      console.error('Wallet transactions error:', error);
      return internalError(set, 'Failed to retrieve wallet transactions');
    }
  }, {
    query: t.Object({
      limit: t.Optional(t.String({ pattern: '^[0-9]+$' })),
      offset: t.Optional(t.String({ pattern: '^[0-9]+$' })),
    }),
  })

  // Request withdrawal
  .post('/withdraw', async ({ body, headers, cookie, set }) => {
    try {
      const token = extractToken(headers, cookie);
      if (!token) return unauthorized(set);

      const validation = await authService.validateAccessToken(token);
      if (!validation.isValid || !validation.payload) return unauthorized(set);

      const { amount, description } = body as { amount: number; description?: string };

      const walletTx = await walletService.debit(
        validation.payload.userId,
        amount,
        'withdrawal',
        'manual',
        undefined,
        description || 'Manual withdrawal'
      );

      return {
        message: 'Withdrawal processed successfully',
        transaction: walletTx,
      };
    } catch (error) {
      console.error('Wallet withdrawal error:', error);

      if (error instanceof Error && error.message.includes('Insufficient balance')) {
        set.status = 400;
        return {
          error: { code: 'INSUFFICIENT_BALANCE', message: error.message },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        };
      }

      if (error instanceof Error && error.message.includes('Wallet not found')) {
        set.status = 404;
        return {
          error: { code: 'WALLET_NOT_FOUND', message: 'Wallet not found. Make a payment first to create your wallet.' },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        };
      }

      return internalError(set, 'Failed to process withdrawal');
    }
  }, {
    body: t.Object({
      amount: t.Number({ minimum: 0.01, maximum: 999999.99 }),
      description: t.Optional(t.String({ maxLength: 255 })),
    }),
  });

// ── Helpers ───────────────────────────────────────────────────────────────

function extractToken(headers: Record<string, string | undefined>, cookie: any): string | null {
  let token = authService.extractTokenFromHeader(headers.authorization);
  if (!token && cookie.accessToken) {
    token = cookie.accessToken.value || null;
  }
  return token;
}

function unauthorized(set: any) {
  set.status = 401;
  return {
    error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
  };
}

function internalError(set: any, message: string) {
  set.status = 500;
  return {
    error: { code: 'INTERNAL_ERROR', message },
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
  };
}
