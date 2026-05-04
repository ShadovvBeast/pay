import { db } from './database.js';
import type { Wallet, WalletTransaction, WalletTransactionType } from '../types/index.js';

class WalletService {
  /**
   * Get or create a wallet for a user.
   * Each user has exactly one wallet, created lazily on first access.
   */
  async getOrCreateWallet(userId: string, currency: string = 'ILS'): Promise<Wallet> {
    // Try to find existing wallet
    const existing = await db.queryOne<Wallet>(
      `SELECT id, user_id AS "userId", balance, currency, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM wallets WHERE user_id = $1`,
      [userId]
    );

    if (existing) {
      existing.balance = parseFloat(existing.balance as any);
      return existing;
    }

    // Create new wallet
    const created = await db.queryOne<Wallet>(
      `INSERT INTO wallets (user_id, currency) VALUES ($1, $2)
       RETURNING id, user_id AS "userId", balance, currency, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [userId, currency]
    );

    if (!created) {
      throw new Error('Failed to create wallet');
    }

    created.balance = parseFloat(created.balance as any);
    return created;
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
   */
  async credit(
    userId: string,
    amount: number,
    referenceType?: string,
    referenceId?: string,
    description?: string
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

      if (walletResult.rows.length === 0) {
        // Create wallet inside the transaction
        const newWallet = await client.query(
          `INSERT INTO wallets (user_id) VALUES ($1) RETURNING id, balance`,
          [userId]
        );
        walletId = newWallet.rows[0].id;
        currentBalance = 0;
      } else {
        walletId = walletResult.rows[0].id;
        currentBalance = parseFloat(walletResult.rows[0].balance);
      }

      const newBalance = currentBalance + amount;

      // Update wallet balance
      await client.query(
        `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
        [newBalance, walletId]
      );

      // Record the transaction
      const txResult = await client.query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, reference_type, reference_id, description)
         VALUES ($1, 'deposit', $2, $3, $4, $5, $6)
         RETURNING id, wallet_id AS "walletId", type, amount, balance_after AS "balanceAfter",
                   reference_type AS "referenceType", reference_id AS "referenceId", description,
                   created_at AS "createdAt"`,
        [walletId, amount, newBalance, referenceType || null, referenceId || null, description || null]
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
}

export const walletService = new WalletService();
