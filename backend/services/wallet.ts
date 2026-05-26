import { db } from './database.js';
import { currencyConverter } from './currencyConverter.js';
import type { Wallet, WalletTransaction, WalletTransactionType, WalletBalance, SupportedAsset, AssetPrice } from '../types/index.js';

/**
 * Generate a 20-character alphanumeric wallet ID.
 * Uses characters that avoid ambiguity (no 0/O, 1/I/L).
 */
function generateWalletId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

class WalletService {
  /**
   * Get or create a wallet for a user.
   * Each user has exactly one wallet, created lazily on first access.
   */
  async getOrCreateWallet(userId: string, currency: string = 'ILS'): Promise<Wallet> {
    // Try to find existing wallet
    const existing = await db.queryOne<Wallet>(
      `SELECT id, wallet_id AS "walletId", user_id AS "userId", balance, currency, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM wallets WHERE user_id = $1`,
      [userId]
    );

    if (existing) {
      existing.balance = parseFloat(existing.balance as any);
      return existing;
    }

    // Create new wallet with a unique wallet_id
    let walletId = generateWalletId();
    let attempts = 0;
    while (attempts < 10) {
      try {
        const created = await db.queryOne<Wallet>(
          `INSERT INTO wallets (user_id, currency, wallet_id) VALUES ($1, $2, $3)
           RETURNING id, wallet_id AS "walletId", user_id AS "userId", balance, currency, created_at AS "createdAt", updated_at AS "updatedAt"`,
          [userId, currency, walletId]
        );

        if (!created) throw new Error('Failed to create wallet');
        created.balance = parseFloat(created.balance as any);
        return created;
      } catch (error: any) {
        // If wallet_id collision, retry with a new one
        if (error.message?.includes('unique') || error.code === '23505') {
          walletId = generateWalletId();
          attempts++;
        } else {
          throw error;
        }
      }
    }
    throw new Error('Failed to generate unique wallet ID');
  }

  /**
   * Look up a wallet by its public wallet ID.
   * Returns wallet owner info for transfer confirmation.
   */
  async lookupByWalletId(walletId: string): Promise<{ walletId: string; shopName: string; ownerName: string; currency: string } | null> {
    const result = await db.queryOne<{ walletId: string; shopName: string; ownerName: string; currency: string }>(
      `SELECT w.wallet_id AS "walletId", u.shop_name AS "shopName", u.owner_name AS "ownerName", w.currency
       FROM wallets w
       JOIN users u ON u.id = w.user_id
       WHERE w.wallet_id = $1`,
      [walletId.toUpperCase().trim()]
    );
    return result || null;
  }

  /**
   * Transfer funds from one wallet to another.
   */
  async transfer(
    fromUserId: string,
    toWalletId: string,
    amount: number,
    description?: string
  ): Promise<{ senderTx: WalletTransaction; recipientTx: WalletTransaction }> {
    if (amount <= 0) throw new Error('Transfer amount must be positive');

    return await db.transaction(async (client) => {
      // Look up recipient wallet
      const recipientResult = await client.query(
        `SELECT w.id, w.wallet_id, w.user_id, w.balance, u.shop_name, u.owner_name
         FROM wallets w JOIN users u ON u.id = w.user_id
         WHERE w.wallet_id = $1 FOR UPDATE`,
        [toWalletId.toUpperCase().trim()]
      );

      if (recipientResult.rows.length === 0) {
        throw new Error('Recipient wallet not found');
      }

      const recipient = recipientResult.rows[0];

      // Lock sender wallet
      const senderResult = await client.query(
        `SELECT id, wallet_id, balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
        [fromUserId]
      );

      if (senderResult.rows.length === 0) {
        throw new Error('Sender wallet not found');
      }

      const sender = senderResult.rows[0];

      // Can't transfer to yourself
      if (sender.id === recipient.id) {
        throw new Error('Cannot transfer to your own wallet');
      }

      const senderBalance = parseFloat(sender.balance);
      if (senderBalance < amount) {
        throw new Error(`Insufficient balance. Available: ${senderBalance.toFixed(2)}, requested: ${amount.toFixed(2)}`);
      }

      const newSenderBalance = senderBalance - amount;
      const newRecipientBalance = parseFloat(recipient.balance) + amount;

      // Update sender balance
      await client.query(
        `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
        [newSenderBalance, sender.id]
      );

      // Update recipient balance
      await client.query(
        `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
        [newRecipientBalance, recipient.id]
      );

      const transferDesc = description || `Transfer to ${recipient.shop_name}`;
      const receiveDesc = `Transfer from wallet ${sender.wallet_id}`;

      // Record sender transaction
      const senderTxResult = await client.query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, reference_type, reference_id, description)
         VALUES ($1, 'transfer_out', $2, $3, 'transfer', $4, $5)
         RETURNING id, wallet_id AS "walletId", type, amount, balance_after AS "balanceAfter",
                   reference_type AS "referenceType", reference_id AS "referenceId", description,
                   created_at AS "createdAt"`,
        [sender.id, amount, newSenderBalance, recipient.id, transferDesc]
      );

      // Record recipient transaction
      const recipientTxResult = await client.query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, reference_type, reference_id, description)
         VALUES ($1, 'transfer_in', $2, $3, 'transfer', $4, $5)
         RETURNING id, wallet_id AS "walletId", type, amount, balance_after AS "balanceAfter",
                   reference_type AS "referenceType", reference_id AS "referenceId", description,
                   created_at AS "createdAt"`,
        [recipient.id, amount, newRecipientBalance, sender.id, receiveDesc]
      );

      const senderTx = senderTxResult.rows[0] as WalletTransaction;
      senderTx.amount = parseFloat(senderTx.amount as any);
      senderTx.balanceAfter = parseFloat(senderTx.balanceAfter as any);

      const recipientTx = recipientTxResult.rows[0] as WalletTransaction;
      recipientTx.amount = parseFloat(recipientTx.amount as any);
      recipientTx.balanceAfter = parseFloat(recipientTx.balanceAfter as any);

      return { senderTx, recipientTx };
    });
  }

  /**
   * Get wallet balance for a user.
   */
  async getBalance(userId: string): Promise<{ balance: number; currency: string }> {
    const wallet = await this.getOrCreateWallet(userId);
    return { balance: wallet.balance, currency: wallet.currency };
  }

  /**
   * Credit the wallet (deposit money).
   * Used when a payment is completed.
   * If sourceCurrency differs from the wallet currency, auto-converts at market rate.
   */
  async credit(
    userId: string,
    amount: number,
    referenceType?: string,
    referenceId?: string,
    description?: string,
    sourceCurrency?: string
  ): Promise<WalletTransaction> {
    if (amount <= 0) throw new Error('Credit amount must be positive');

    return await db.transaction(async (client) => {
      // Lock the wallet row for update to prevent race conditions
      const walletResult = await client.query(
        `SELECT id, balance, currency FROM wallets WHERE user_id = $1 FOR UPDATE`,
        [userId]
      );

      let walletId: string;
      let currentBalance: number;
      let walletCurrency: string;

      if (walletResult.rows.length === 0) {
        // Create wallet inside the transaction
        const newWallet = await client.query(
          `INSERT INTO wallets (user_id) VALUES ($1) RETURNING id, balance, currency`,
          [userId]
        );
        walletId = newWallet.rows[0].id;
        currentBalance = 0;
        walletCurrency = newWallet.rows[0].currency;
      } else {
        walletId = walletResult.rows[0].id;
        currentBalance = parseFloat(walletResult.rows[0].balance);
        walletCurrency = walletResult.rows[0].currency;
      }

      // Convert currency if needed
      let creditAmount = amount;
      let conversionNote = '';
      if (sourceCurrency && sourceCurrency.toUpperCase() !== walletCurrency.toUpperCase()) {
        const { convertedAmount, rate } = await currencyConverter.convert(amount, sourceCurrency, walletCurrency);
        creditAmount = convertedAmount;
        conversionNote = ` (converted from ${sourceCurrency} ${amount.toLocaleString()} at rate ${rate.toFixed(6)})`;
      }

      const newBalance = currentBalance + creditAmount;

      // Update wallet balance
      await client.query(
        `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
        [newBalance, walletId]
      );

      // Record the transaction
      const finalDescription = (description || '') + conversionNote;
      const txResult = await client.query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, reference_type, reference_id, description)
         VALUES ($1, 'deposit', $2, $3, $4, $5, $6)
         RETURNING id, wallet_id AS "walletId", type, amount, balance_after AS "balanceAfter",
                   reference_type AS "referenceType", reference_id AS "referenceId", description,
                   created_at AS "createdAt"`,
        [walletId, creditAmount, newBalance, referenceType || null, referenceId || null, finalDescription || null]
      );

      const walletTx = txResult.rows[0] as WalletTransaction;
      walletTx.amount = parseFloat(walletTx.amount as any);
      walletTx.balanceAfter = parseFloat(walletTx.balanceAfter as any);
      return walletTx;
    });
  }

  /**
   * Debit the wallet (withdraw money or refund debit).
   */
  async debit(
    userId: string,
    amount: number,
    type: 'withdrawal' | 'refund_debit' = 'withdrawal',
    referenceType?: string,
    referenceId?: string,
    description?: string
  ): Promise<WalletTransaction> {
    if (amount <= 0) throw new Error('Debit amount must be positive');

    return await db.transaction(async (client) => {
      // Lock the wallet row
      const walletResult = await client.query(
        `SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
        [userId]
      );

      if (walletResult.rows.length === 0) {
        throw new Error('Wallet not found');
      }

      const walletId = walletResult.rows[0].id;
      const currentBalance = parseFloat(walletResult.rows[0].balance);

      if (currentBalance < amount) {
        throw new Error(`Insufficient balance. Available: ${currentBalance.toFixed(2)}, requested: ${amount.toFixed(2)}`);
      }

      const newBalance = currentBalance - amount;

      // Update wallet balance
      await client.query(
        `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
        [newBalance, walletId]
      );

      // Record the transaction
      const txResult = await client.query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, reference_type, reference_id, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, wallet_id AS "walletId", type, amount, balance_after AS "balanceAfter",
                   reference_type AS "referenceType", reference_id AS "referenceId", description,
                   created_at AS "createdAt"`,
        [walletId, type, amount, newBalance, referenceType || null, referenceId || null, description || null]
      );

      const walletTx = txResult.rows[0] as WalletTransaction;
      walletTx.amount = parseFloat(walletTx.amount as any);
      walletTx.balanceAfter = parseFloat(walletTx.balanceAfter as any);
      return walletTx;
    });
  }

  /**
   * Get wallet transaction history with pagination.
   */
  async getTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ transactions: WalletTransaction[]; total: number }> {
    const wallet = await this.getOrCreateWallet(userId);

    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM wallet_transactions WHERE wallet_id = $1`,
      [wallet.id]
    );
    const total = parseInt(countResult?.count || '0');

    const result = await db.query<WalletTransaction>(
      `SELECT id, wallet_id AS "walletId", type, amount, balance_after AS "balanceAfter",
              asset_code AS "assetCode", network,
              reference_type AS "referenceType", reference_id AS "referenceId", description,
              created_at AS "createdAt"
       FROM wallet_transactions
       WHERE wallet_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [wallet.id, limit, offset]
    );

    const transactions = result.rows.map((tx) => ({
      ...tx,
      amount: parseFloat(tx.amount as any),
      balanceAfter: parseFloat(tx.balanceAfter as any),
    }));

    return { transactions, total };
  }

  // ─── Multi-Asset Methods ─────────────────────────────────────────────────

  /**
   * Get all asset balances for a user's wallet.
   */
  async getAssetBalances(userId: string): Promise<WalletBalance[]> {
    const wallet = await this.getOrCreateWallet(userId);

    const result = await db.query<WalletBalance>(
      `SELECT wb.id, wb.wallet_id AS "walletId", wb.asset_code AS "assetCode",
              wb.balance, wb.deposit_address AS "depositAddress",
              wb.created_at AS "createdAt", wb.updated_at AS "updatedAt"
       FROM wallet_balances wb
       WHERE wb.wallet_id = $1
       ORDER BY wb.balance DESC`,
      [wallet.id]
    );

    return result.rows.map(row => ({
      ...row,
      balance: parseFloat(row.balance as any),
    }));
  }

  /**
   * Get or create a balance entry for a specific asset.
   */
  async getOrCreateAssetBalance(walletId: string, assetCode: string): Promise<WalletBalance> {
    const existing = await db.queryOne<WalletBalance>(
      `SELECT id, wallet_id AS "walletId", asset_code AS "assetCode", balance,
              deposit_address AS "depositAddress", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM wallet_balances WHERE wallet_id = $1 AND asset_code = $2`,
      [walletId, assetCode]
    );

    if (existing) {
      existing.balance = parseFloat(existing.balance as any);
      return existing;
    }

    const created = await db.queryOne<WalletBalance>(
      `INSERT INTO wallet_balances (wallet_id, asset_code) VALUES ($1, $2)
       RETURNING id, wallet_id AS "walletId", asset_code AS "assetCode", balance,
                 deposit_address AS "depositAddress", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [walletId, assetCode]
    );

    if (!created) throw new Error('Failed to create asset balance');
    created.balance = parseFloat(created.balance as any);
    return created;
  }

  /**
   * Credit a specific asset in the wallet.
   */
  async creditAsset(
    userId: string,
    assetCode: string,
    amount: number,
    referenceType?: string,
    referenceId?: string,
    description?: string
  ): Promise<WalletTransaction> {
    if (amount <= 0) throw new Error('Credit amount must be positive');

    const wallet = await this.getOrCreateWallet(userId);

    return await db.transaction(async (client) => {
      // Lock or create the asset balance row
      let balRow = await client.query(
        `SELECT id, balance FROM wallet_balances WHERE wallet_id = $1 AND asset_code = $2 FOR UPDATE`,
        [wallet.id, assetCode]
      );

      let currentBalance: number;
      if (balRow.rows.length === 0) {
        const ins = await client.query(
          `INSERT INTO wallet_balances (wallet_id, asset_code) VALUES ($1, $2) RETURNING balance`,
          [wallet.id, assetCode]
        );
        currentBalance = 0;
      } else {
        currentBalance = parseFloat(balRow.rows[0].balance);
      }

      const newBalance = currentBalance + amount;

      await client.query(
        `UPDATE wallet_balances SET balance = $1, updated_at = NOW() WHERE wallet_id = $2 AND asset_code = $3`,
        [newBalance, wallet.id, assetCode]
      );

      // Also update legacy wallets.balance for FIAT_CARD (backward compat)
      if (assetCode === 'FIAT_CARD') {
        await client.query(`UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`, [newBalance, wallet.id]);
      }

      const txResult = await client.query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, asset_code, reference_type, reference_id, description)
         VALUES ($1, 'deposit', $2, $3, $4, $5, $6, $7)
         RETURNING id, wallet_id AS "walletId", type, amount, balance_after AS "balanceAfter",
                   asset_code AS "assetCode", reference_type AS "referenceType", reference_id AS "referenceId",
                   description, created_at AS "createdAt"`,
        [wallet.id, amount, newBalance, assetCode, referenceType || null, referenceId || null, description || null]
      );

      const tx = txResult.rows[0] as WalletTransaction;
      tx.amount = parseFloat(tx.amount as any);
      tx.balanceAfter = parseFloat(tx.balanceAfter as any);
      return tx;
    });
  }

  /**
   * Swap between two crypto assets at market rate.
   * Only crypto assets marked as is_swappable can be swapped.
   */
  async swapAssets(
    userId: string,
    fromAsset: string,
    toAsset: string,
    amount: number
  ): Promise<{ fromTx: WalletTransaction; toTx: WalletTransaction; rate: number }> {
    if (amount <= 0) throw new Error('Swap amount must be positive');
    if (fromAsset === toAsset) throw new Error('Cannot swap an asset with itself');

    // Verify both assets are swappable
    const fromInfo = await db.queryOne<{ is_swappable: boolean; asset_type: string }>(
      `SELECT is_swappable, asset_type FROM supported_assets WHERE code = $1`, [fromAsset]
    );
    const toInfo = await db.queryOne<{ is_swappable: boolean; asset_type: string }>(
      `SELECT is_swappable, asset_type FROM supported_assets WHERE code = $1`, [toAsset]
    );

    if (!fromInfo || !toInfo) throw new Error('One or both assets are not supported');
    if (!fromInfo.is_swappable) throw new Error(`${fromAsset} cannot be swapped`);
    if (!toInfo.is_swappable) throw new Error(`${toAsset} cannot be swapped`);

    // Get prices for both assets
    const fromPrice = await db.queryOne<{ price_usd: number }>(
      `SELECT price_usd FROM asset_prices WHERE asset_code = $1`, [fromAsset]
    );
    const toPrice = await db.queryOne<{ price_usd: number }>(
      `SELECT price_usd FROM asset_prices WHERE asset_code = $1`, [toAsset]
    );

    if (!fromPrice || !toPrice) throw new Error('Price data not available for swap');

    const fromPriceUsd = parseFloat(fromPrice.price_usd as any);
    const toPriceUsd = parseFloat(toPrice.price_usd as any);
    const rate = fromPriceUsd / toPriceUsd;
    const toAmount = amount * rate;

    const wallet = await this.getOrCreateWallet(userId);

    return await db.transaction(async (client) => {
      // Lock from-asset balance
      const fromBal = await client.query(
        `SELECT balance FROM wallet_balances WHERE wallet_id = $1 AND asset_code = $2 FOR UPDATE`,
        [wallet.id, fromAsset]
      );

      if (fromBal.rows.length === 0) throw new Error(`No ${fromAsset} balance found`);
      const currentFrom = parseFloat(fromBal.rows[0].balance);
      if (currentFrom < amount) throw new Error(`Insufficient ${fromAsset} balance. Have: ${currentFrom}, need: ${amount}`);

      // Lock or create to-asset balance
      let toBal = await client.query(
        `SELECT balance FROM wallet_balances WHERE wallet_id = $1 AND asset_code = $2 FOR UPDATE`,
        [wallet.id, toAsset]
      );
      let currentTo = 0;
      if (toBal.rows.length === 0) {
        await client.query(`INSERT INTO wallet_balances (wallet_id, asset_code) VALUES ($1, $2)`, [wallet.id, toAsset]);
      } else {
        currentTo = parseFloat(toBal.rows[0].balance);
      }

      const newFrom = currentFrom - amount;
      const newTo = currentTo + toAmount;

      // Update balances
      await client.query(`UPDATE wallet_balances SET balance = $1, updated_at = NOW() WHERE wallet_id = $2 AND asset_code = $3`, [newFrom, wallet.id, fromAsset]);
      await client.query(`UPDATE wallet_balances SET balance = $1, updated_at = NOW() WHERE wallet_id = $2 AND asset_code = $3`, [newTo, wallet.id, toAsset]);

      // Record swap_out
      const fromTxResult = await client.query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, asset_code, description)
         VALUES ($1, 'swap_out', $2, $3, $4, $5)
         RETURNING id, wallet_id AS "walletId", type, amount, balance_after AS "balanceAfter", asset_code AS "assetCode", description, created_at AS "createdAt"`,
        [wallet.id, amount, newFrom, fromAsset, `Swapped to ${toAsset} at rate ${rate.toFixed(8)}`]
      );

      // Record swap_in
      const toTxResult = await client.query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, asset_code, description)
         VALUES ($1, 'swap_in', $2, $3, $4, $5)
         RETURNING id, wallet_id AS "walletId", type, amount, balance_after AS "balanceAfter", asset_code AS "assetCode", description, created_at AS "createdAt"`,
        [wallet.id, toAmount, newTo, toAsset, `Swapped from ${fromAsset} at rate ${rate.toFixed(8)}`]
      );

      const fromTx = fromTxResult.rows[0] as WalletTransaction;
      fromTx.amount = parseFloat(fromTx.amount as any);
      fromTx.balanceAfter = parseFloat(fromTx.balanceAfter as any);

      const toTx = toTxResult.rows[0] as WalletTransaction;
      toTx.amount = parseFloat(toTx.amount as any);
      toTx.balanceAfter = parseFloat(toTx.balanceAfter as any);

      return { fromTx, toTx, rate };
    });
  }

  /**
   * Get all supported assets.
   */
  async getSupportedAssets(): Promise<SupportedAsset[]> {
    const result = await db.query<any>(
      `SELECT code, name, symbol, asset_type AS "assetType", network, decimals,
              is_swappable AS "isSwappable", is_active AS "isActive", icon_url AS "iconUrl"
       FROM supported_assets WHERE is_active = TRUE ORDER BY asset_type, code`
    );
    return result.rows;
  }

  /**
   * Get current asset prices (USD-denominated).
   */
  async getAssetPrices(): Promise<AssetPrice[]> {
    const result = await db.query<any>(
      `SELECT asset_code AS "assetCode", price_usd AS "priceUsd", updated_at AS "updatedAt"
       FROM asset_prices`
    );
    return result.rows.map((r: any) => ({ ...r, priceUsd: parseFloat(r.priceUsd) }));
  }

  /**
   * Get total portfolio value in USD for a user.
   */
  async getPortfolioValue(userId: string): Promise<{ totalUsd: number; assets: Array<{ assetCode: string; balance: number; valueUsd: number }> }> {
    const wallet = await this.getOrCreateWallet(userId);

    const result = await db.query<any>(
      `SELECT wb.asset_code AS "assetCode", wb.balance, COALESCE(ap.price_usd, 1) AS "priceUsd"
       FROM wallet_balances wb
       LEFT JOIN asset_prices ap ON ap.asset_code = wb.asset_code
       WHERE wb.wallet_id = $1 AND wb.balance > 0`,
      [wallet.id]
    );

    let totalUsd = 0;
    const assets = result.rows.map((row: any) => {
      const balance = parseFloat(row.balance);
      const priceUsd = parseFloat(row.priceUsd);
      const valueUsd = balance * priceUsd;
      totalUsd += valueUsd;
      return { assetCode: row.assetCode, balance, valueUsd: Math.round(valueUsd * 100) / 100 };
    });

    return { totalUsd: Math.round(totalUsd * 100) / 100, assets };
  }
}

export const walletService = new WalletService();
