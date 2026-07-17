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
  })

  // ── Multi-Asset Endpoints ──────────────────────────────────────────────

  // Get all asset balances + portfolio value
  .get('/assets', async ({ headers, cookie, set }) => {
    try {
      const token = extractToken(headers, cookie);
      if (!token) return unauthorized(set);

      const validation = await authService.validateAccessToken(token);
      if (!validation.isValid || !validation.payload) return unauthorized(set);

      const [balances, portfolio, assets, prices] = await Promise.all([
        walletService.getAssetBalances(validation.payload.userId),
        walletService.getPortfolioValue(validation.payload.userId),
        walletService.getSupportedAssets(),
        walletService.getAssetPrices(),
      ]);

      return {
        totalValueUsd: portfolio.totalUsd,
        balances: balances.map(b => {
          const asset = assets.find(a => a.code === b.assetCode);
          const price = prices.find(p => p.assetCode === b.assetCode);
          return {
            assetCode: b.assetCode,
            name: asset?.name || b.assetCode,
            symbol: asset?.symbol || '',
            assetType: asset?.assetType || 'fiat',
            network: asset?.network || '',
            balance: b.balance,
            valueUsd: Math.round(b.balance * (price?.priceUsd || 1) * 100) / 100,
            isSwappable: asset?.isSwappable || false,
            depositAddress: b.depositAddress,
          };
        }),
        supportedAssets: assets,
      };
    } catch (error) {
      console.error('Wallet assets error:', error);
      return internalError(set, 'Failed to retrieve asset balances');
    }
  })

  // Swap crypto assets
  .post('/swap', async ({ body, headers, cookie, set }) => {
    try {
      const token = extractToken(headers, cookie);
      if (!token) return unauthorized(set);

      const validation = await authService.validateAccessToken(token);
      if (!validation.isValid || !validation.payload) return unauthorized(set);

      const { fromAsset, toAsset, amount } = body as { fromAsset: string; toAsset: string; amount: number };

      const result = await walletService.swapAssets(
        validation.payload.userId,
        fromAsset,
        toAsset,
        amount
      );

      return {
        message: 'Swap completed',
        rate: result.rate,
        from: { asset: fromAsset, amount, transaction: result.fromTx },
        to: { asset: toAsset, amount: result.toTx.amount, transaction: result.toTx },
      };
    } catch (error) {
      console.error('Wallet swap error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Insufficient')) {
          set.status = 400;
          return { error: { code: 'INSUFFICIENT_BALANCE', message: error.message }, timestamp: new Date().toISOString(), requestId: crypto.randomUUID() };
        }
        if (error.message.includes('cannot be swapped')) {
          set.status = 400;
          return { error: { code: 'NOT_SWAPPABLE', message: error.message }, timestamp: new Date().toISOString(), requestId: crypto.randomUUID() };
        }
        if (error.message.includes('not supported')) {
          set.status = 400;
          return { error: { code: 'UNSUPPORTED_ASSET', message: error.message }, timestamp: new Date().toISOString(), requestId: crypto.randomUUID() };
        }
      }

      return internalError(set, 'Failed to process swap');
    }
  }, {
    body: t.Object({
      fromAsset: t.String({ minLength: 1 }),
      toAsset: t.String({ minLength: 1 }),
      amount: t.Number({ minimum: 0.00000001 }),
    }),
  })

  // Get supported assets list
  .get('/supported-assets', async ({ set }) => {
    try {
      const assets = await walletService.getSupportedAssets();
      const prices = await walletService.getAssetPrices();
      return { assets, prices };
    } catch (error) {
      console.error('Supported assets error:', error);
      return internalError(set, 'Failed to retrieve supported assets');
    }
  })

  // Request a crypto deposit address (user chooses network)
  .post('/deposit', async ({ body, headers, cookie, set }) => {
    try {
      const token = extractToken(headers, cookie);
      if (!token) return unauthorized(set);

      const validation = await authService.validateAccessToken(token);
      if (!validation.isValid || !validation.payload) return unauthorized(set);

      const { cryptoWalletService } = await import('../services/cryptoWallet.js');

      if (!cryptoWalletService.isAvailable()) {
        set.status = 503;
        return {
          error: { code: 'CRYPTO_NOT_CONFIGURED', message: 'Crypto wallet system is not configured yet.' },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        };
      }

      const { network } = body as { network?: string };
      const selectedNetwork = network || 'polygon';

      // Get or create the user's wallet (same address works on all EVM networks)
      const walletInfo = await cryptoWalletService.getOrCreateWallet(validation.payload.userId);

      const networkInfo: Record<string, { name: string; assets: string; note: string }> = {
        polygon: { name: 'Polygon', assets: 'USDT, USDC, MATIC', note: 'Standard gas fees apply' },
        plasma: { name: 'Plasma', assets: 'USDT', note: 'Zero-fee USDT transfers' },
      };

      const info = networkInfo[selectedNetwork] || networkInfo.polygon;

      return {
        address: walletInfo.address,
        network: selectedNetwork,
        networkName: info.name,
        supportedAssets: info.assets,
        note: info.note,
        message: `Send ${info.assets} on ${info.name} network to this address.`,
        createdAt: walletInfo.createdAt,
      };
    } catch (error) {
      console.error('Crypto deposit address error:', error);
      return internalError(set, 'Failed to get deposit address');
    }
  }, {
    body: t.Optional(t.Object({
      network: t.Optional(t.Union([t.Literal('polygon'), t.Literal('plasma')])),
    })),
  })

  // Get on-chain crypto balances
  .get('/crypto-balances', async ({ headers, cookie, set }) => {
    try {
      const token = extractToken(headers, cookie);
      if (!token) return unauthorized(set);

      const validation = await authService.validateAccessToken(token);
      if (!validation.isValid || !validation.payload) return unauthorized(set);

      const { cryptoWalletService } = await import('../services/cryptoWallet.js');

      if (!cryptoWalletService.isAvailable()) {
        return { balances: [], network: 'polygon', message: 'Crypto not configured' };
      }

      const balances = await cryptoWalletService.getBalances(validation.payload.userId);
      return { balances, network: 'polygon' };
    } catch (error) {
      console.error('Crypto balances error:', error);
      return internalError(set, 'Failed to get crypto balances');
    }
  })

  // Buy crypto with fiat (via broker)
  .post('/buy-crypto', async ({ body, headers, cookie, set }) => {
    try {
      const token = extractToken(headers, cookie);
      if (!token) return unauthorized(set);

      const validation = await authService.validateAccessToken(token);
      if (!validation.isValid || !validation.payload) return unauthorized(set);

      const { asset, fiatAmount } = body as { asset: string; fiatAmount: number };
      const { cryptoWalletService } = await import('../services/cryptoWallet.js');

      if (!cryptoWalletService.isAvailable()) {
        set.status = 503;
        return { error: { code: 'CRYPTO_NOT_CONFIGURED', message: 'Crypto not available' } };
      }

      // Get current price to calculate crypto amount
      const prices = await walletService.getAssetPrices();
      const assetCode = `${asset.toUpperCase()}_POLYGON`;
      const price = prices.find(p => p.assetCode === assetCode);

      if (!price || price.priceUsd <= 0) {
        set.status = 400;
        return { error: { code: 'PRICE_UNAVAILABLE', message: `Price not available for ${asset}` } };
      }

      const cryptoAmount = fiatAmount / price.priceUsd;

      const result = await cryptoWalletService.buyFromBroker(
        validation.payload.userId,
        asset,
        cryptoAmount,
        fiatAmount,
        'USD'
      );

      return { ...result, rate: price.priceUsd, fiatSpent: fiatAmount };
    } catch (error) {
      console.error('Buy crypto error:', error);
      if (error instanceof Error && error.message.includes('Insufficient')) {
        set.status = 400;
        return { error: { code: 'INSUFFICIENT_BALANCE', message: error.message } };
      }
      return internalError(set, 'Failed to buy crypto');
    }
  }, {
    body: t.Object({
      asset: t.String({ minLength: 1 }),
      fiatAmount: t.Number({ minimum: 0.01 }),
    }),
  })

  // Sell crypto for fiat (via broker)
  .post('/sell-crypto', async ({ body, headers, cookie, set }) => {
    try {
      const token = extractToken(headers, cookie);
      if (!token) return unauthorized(set);

      const validation = await authService.validateAccessToken(token);
      if (!validation.isValid || !validation.payload) return unauthorized(set);

      const { asset, cryptoAmount } = body as { asset: string; cryptoAmount: number };
      const { cryptoWalletService } = await import('../services/cryptoWallet.js');

      if (!cryptoWalletService.isAvailable()) {
        set.status = 503;
        return { error: { code: 'CRYPTO_NOT_CONFIGURED', message: 'Crypto not available' } };
      }

      // Get current price
      const prices = await walletService.getAssetPrices();
      const assetCode = `${asset.toUpperCase()}_POLYGON`;
      const price = prices.find(p => p.assetCode === assetCode);

      if (!price || price.priceUsd <= 0) {
        set.status = 400;
        return { error: { code: 'PRICE_UNAVAILABLE', message: `Price not available for ${asset}` } };
      }

      const fiatAmount = cryptoAmount * price.priceUsd;

      const result = await cryptoWalletService.sellToBroker(
        validation.payload.userId,
        asset,
        cryptoAmount,
        fiatAmount
      );

      return { ...result, rate: price.priceUsd, cryptoSold: cryptoAmount };
    } catch (error) {
      console.error('Sell crypto error:', error);
      if (error instanceof Error && error.message.includes('Insufficient')) {
        set.status = 400;
        return { error: { code: 'INSUFFICIENT_BALANCE', message: error.message } };
      }
      return internalError(set, 'Failed to sell crypto');
    }
  }, {
    body: t.Object({
      asset: t.String({ minLength: 1 }),
      cryptoAmount: t.Number({ minimum: 0.00000001 }),
    }),
  })

  // Send crypto to external address (on-chain, user chooses network)
  .post('/send-crypto', async ({ body, headers, cookie, set }) => {
    try {
      const token = extractToken(headers, cookie);
      if (!token) return unauthorized(set);

      const validation = await authService.validateAccessToken(token);
      if (!validation.isValid || !validation.payload) return unauthorized(set);

      const { asset, toAddress, amount, network } = body as { asset: string; toAddress: string; amount: number; network?: string };
      const { cryptoWalletService } = await import('../services/cryptoWallet.js');

      if (!cryptoWalletService.isAvailable()) {
        set.status = 503;
        return { error: { code: 'CRYPTO_NOT_CONFIGURED', message: 'Crypto not available' } };
      }

      // If network is plasma and asset is USDT, use USDT_PLASMA
      const resolvedAsset = (network === 'plasma' && asset.toUpperCase() === 'USDT') ? 'USDT_PLASMA' : asset;

      const result = await cryptoWalletService.externalSend(
        validation.payload.userId,
        toAddress,
        resolvedAsset,
        amount
      );

      return { ...result, network: network || 'polygon' };
    } catch (error) {
      console.error('Send crypto error:', error);
      if (error instanceof Error && error.message.includes('Insufficient')) {
        set.status = 400;
        return { error: { code: 'INSUFFICIENT_BALANCE', message: error.message } };
      }
      return internalError(set, 'Failed to send crypto');
    }
  }, {
    body: t.Object({
      asset: t.String({ minLength: 1 }),
      toAddress: t.String({ minLength: 42, maxLength: 42 }),
      amount: t.Number({ minimum: 0.00000001 }),
      network: t.Optional(t.Union([t.Literal('polygon'), t.Literal('plasma')])),
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
