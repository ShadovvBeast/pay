import type { PoolClient } from 'pg';
import { db } from './database.js';
import type { Transaction, CreateTransactionData } from '../types/index.js';
import { validateCreateTransactionData, sanitizeCreateTransactionData } from '../models/transaction.js';
import type { TransactionStatus } from '../models/transaction.js';

export interface TransactionRepository {
  create(data: CreateTransactionData): Promise<Transaction>;
  findById(id: string): Promise<Transaction | null>;
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Transaction[]>;
  findByStatus(status: TransactionStatus, limit?: number, offset?: number): Promise<Transaction[]>;
  findByAllPayId(allpayTransactionId: string): Promise<Transaction | null>;
  findByUserIdInDateRange(userId: string, startDate: Date, endDate: Date): Promise<Transaction[]>;
  updateStatus(id: string, status: TransactionStatus, allpayTransactionId?: string): Promise<Transaction | null>;
  update(id: string, updates: Partial<Transaction>): Promise<Transaction | null>;
  delete(id: string): Promise<boolean>;
  countByUserId(userId: string): Promise<number>;
  findRecentByUserId(userId: string, hours: number): Promise<Transaction[]>;
}

export class PostgresTransactionRepository implements TransactionRepository {
  /**
   * Create a new transaction
   */
  async create(data: CreateTransactionData): Promise<Transaction> {
    // Validate input data
    const validation = validateCreateTransactionData(data);
    if (!validation.isValid) {
      throw new Error(`Invalid transaction data: ${validation.errors.join(', ')}`);
    }

    // Sanitize data
    const sanitizedData = sanitizeCreateTransactionData(data);

    const query = `
      INSERT INTO transactions (
        user_id, 
        amount, 
        currency, 
        payment_url, 
        allpay_transaction_id,
        status,
        description,
        line_items,
        customer_email,
        customer_name,
        customer_phone,
        customer_id_number,
        max_installments,
        fixed_installments,
        expires_at,
        preauthorize,
        custom_field_1,
        custom_field_2,
        success_url,
        cancel_url,
        webhook_url,
        metadata,
        api_key_id,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW(), NOW())
      RETURNING 
        id,
        user_id as "userId",
        amount,
        currency,
        payment_url as "paymentUrl",
        allpay_transaction_id as "allpayTransactionId",
        status,
        description,
        line_items as "lineItems",
        customer_email as "customerEmail",
        customer_name as "customerName",
        customer_phone as "customerPhone",
        customer_id_number as "customerIdNumber",
        max_installments as "maxInstallments",
        fixed_installments as "fixedInstallments",
        expires_at as "expiresAt",
        preauthorize,
        custom_field_1 as "customField1",
        custom_field_2 as "customField2",
        success_url as "successUrl",
        cancel_url as "cancelUrl",
        webhook_url as "webhookUrl",
        metadata,
        api_key_id as "apiKeyId",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const values = [
      sanitizedData.userId,
      sanitizedData.amount,
      sanitizedData.currency,
      sanitizedData.paymentUrl,
      sanitizedData.allpayTransactionId || null,
      'pending', // Default status
      sanitizedData.description || null,
      sanitizedData.lineItems ? JSON.stringify(sanitizedData.lineItems) : null,
      sanitizedData.customerEmail || null,
      sanitizedData.customerName || null,
      sanitizedData.customerPhone || null,
      sanitizedData.customerIdNumber || null,
      sanitizedData.maxInstallments || null,
      sanitizedData.fixedInstallments || false,
      sanitizedData.expiresAt || null,
      sanitizedData.preauthorize || false,
      sanitizedData.customField1 || null,
      sanitizedData.customField2 || null,
      sanitizedData.successUrl || null,
      sanitizedData.cancelUrl || null,
      sanitizedData.webhookUrl || null,
      sanitizedData.metadata ? JSON.stringify(sanitizedData.metadata) : null,
      sanitizedData.apiKeyId || null
    ];

    try {
      const result = await db.queryOne<Transaction>(query, values);
      if (!result) {
        throw new Error('Failed to create transaction');
      }
      // Convert amount from string to number and parse JSON fields
      result.amount = parseFloat(result.amount as any);
      if (result.lineItems && typeof result.lineItems === 'string') {
        result.lineItems = JSON.parse(result.lineItems);
      }
      if (result.metadata && typeof result.metadata === 'string') {
        result.metadata = JSON.parse(result.metadata);
      }
      return result;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error('Failed to create transaction');
    }
  }

  /**
   * Find transaction by ID
   */
  async findById(id: string): Promise<Transaction | null> {
    const query = `
      SELECT 
        id,
        user_id as "userId",
        amount,
        currency,
        payment_url as "paymentUrl",
        allpay_transaction_id as "allpayTransactionId",
        status,
        description,
        line_items as "lineItems",
        customer_email as "customerEmail",
        customer_name as "customerName",
        customer_phone as "customerPhone",
        customer_id_number as "customerIdNumber",
        max_installments as "maxInstallments",
        fixed_installments as "fixedInstallments",
        expires_at as "expiresAt",
        preauthorize,
        custom_field_1 as "customField1",
        custom_field_2 as "customField2",
        success_url as "successUrl",
        cancel_url as "cancelUrl",
        webhook_url as "webhookUrl",
        metadata,
        api_key_id as "apiKeyId",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM transactions 
      WHERE id = $1
    `;

    try {
      const result = await db.queryOne<Transaction>(query, [id]);
      if (result) {
        result.amount = parseFloat(result.amount as any);
        if (result.lineItems && typeof result.lineItems === 'string') {
          result.lineItems = JSON.parse(result.lineItems);
        }
        if (result.metadata && typeof result.metadata === 'string') {
          result.metadata = JSON.parse(result.metadata);
        }
      }
      return result;
    } catch (error) {
      console.error('Error finding transaction by ID:', error);
      throw new Error('Failed to find transaction');
    }
  }

  /**
   * Find transactions by user ID with pagination
   */
  async findByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<Transaction[]> {
    const query = `
      SELECT 
        id,
        user_id as "userId",
        amount,
        currency,
        payment_url as "paymentUrl",
        allpay_transaction_id as "allpayTransactionId",
        status,
        description,
        line_items as "lineItems",
        customer_email as "customerEmail",
        customer_name as "customerName",
        customer_phone as "customerPhone",
        customer_id_number as "customerIdNumber",
        max_installments as "maxInstallments",
        fixed_installments as "fixedInstallments",
        expires_at as "expiresAt",
        preauthorize,
        custom_field_1 as "customField1",
        custom_field_2 as "customField2",
        success_url as "successUrl",
        cancel_url as "cancelUrl",
        webhook_url as "webhookUrl",
        metadata,
        api_key_id as "apiKeyId",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM transactions 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await db.query<Transaction>(query, [userId, limit, offset]);
      // Convert amounts from strings to numbers and parse JSON fields
      result.rows.forEach(row => {
        row.amount = parseFloat(row.amount as any);
        if (row.lineItems && typeof row.lineItems === 'string') {
          row.lineItems = JSON.parse(row.lineItems as string);
        }
        if (row.metadata && typeof row.metadata === 'string') {
          row.metadata = JSON.parse(row.metadata as string);
        }
      });
      return result.rows;
    } catch (error) {
      console.error('Error finding transactions by user ID:', error);
      throw new Error('Failed to find transactions');
    }
  }

  /**
   * Find transactions by status with pagination
   */
  async findByStatus(status: TransactionStatus, limit: number = 50, offset: number = 0): Promise<Transaction[]> {
    const query = `
      SELECT 
        id,
        user_id as "userId",
        amount,
        currency,
        payment_url as "paymentUrl",
        allpay_transaction_id as "allpayTransactionId",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM transactions 
      WHERE status = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await db.query<Transaction>(query, [status, limit, offset]);
      // Convert amounts from strings to numbers
      result.rows.forEach(row => {
        row.amount = parseFloat(row.amount as any);
      });
      return result.rows;
    } catch (error) {
      console.error('Error finding transactions by status:', error);
      throw new Error('Failed to find transactions');
    }
  }

  /**
   * Update transaction status
   */
  async updateStatus(id: string, status: TransactionStatus, allpayTransactionId?: string): Promise<Transaction | null> {
    const query = `
      UPDATE transactions 
      SET 
        status = $2,
        allpay_transaction_id = COALESCE($3, allpay_transaction_id),
        updated_at = NOW()
      WHERE id = $1
      RETURNING 
        id,
        user_id as "userId",
        amount,
        currency,
        payment_url as "paymentUrl",
        allpay_transaction_id as "allpayTransactionId",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    try {
      const result = await db.queryOne<Transaction>(query, [id, status, allpayTransactionId || null]);
      if (result) {
        result.amount = parseFloat(result.amount as any);
      }
      return result;
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw new Error('Failed to update transaction status');
    }
  }

  /**
   * Update transaction with partial data
   */
  async update(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    const allowedFields = ['amount', 'currency', 'paymentUrl', 'allpayTransactionId', 'status'];
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 2;

    // Build dynamic update query
    Object.entries(updates).forEach(([key, value]) => {
      const dbField = key === 'paymentUrl' ? 'payment_url' : 
                     key === 'allpayTransactionId' ? 'allpay_transaction_id' : 
                     key;
      
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Always update the updated_at timestamp
    updateFields.push('updated_at = NOW()');

    const query = `
      UPDATE transactions 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING 
        id,
        user_id as "userId",
        amount,
        currency,
        payment_url as "paymentUrl",
        allpay_transaction_id as "allpayTransactionId",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    try {
      const result = await db.queryOne<Transaction>(query, [id, ...values]);
      if (result) {
        result.amount = parseFloat(result.amount as any);
      }
      return result;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw new Error('Failed to update transaction');
    }
  }

  /**
   * Delete transaction (soft delete by updating status to cancelled)
   */
  async delete(id: string): Promise<boolean> {
    const query = `
      UPDATE transactions 
      SET 
        status = 'cancelled',
        updated_at = NOW()
      WHERE id = $1 AND status != 'completed'
      RETURNING id
    `;

    try {
      const result = await db.queryOne(query, [id]);
      return result !== null;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw new Error('Failed to delete transaction');
    }
  }

  /**
   * Count transactions by user ID
   */
  async countByUserId(userId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM transactions WHERE user_id = $1';

    try {
      const result = await db.queryOne<{ count: string }>(query, [userId]);
      return parseInt(result?.count || '0', 10);
    } catch (error) {
      console.error('Error counting transactions:', error);
      throw new Error('Failed to count transactions');
    }
  }

  /**
   * Find recent transactions by user ID within specified hours
   */
  async findRecentByUserId(userId: string, hours: number): Promise<Transaction[]> {
    const query = `
      SELECT 
        id,
        user_id as "userId",
        amount,
        currency,
        payment_url as "paymentUrl",
        allpay_transaction_id as "allpayTransactionId",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM transactions 
      WHERE user_id = $1 
        AND created_at >= NOW() - INTERVAL '${hours} hours'
      ORDER BY created_at DESC
    `;

    try {
      const result = await db.query<Transaction>(query, [userId]);
      // Convert amounts from strings to numbers
      result.rows.forEach(row => {
        row.amount = parseFloat(row.amount as any);
      });
      return result.rows;
    } catch (error) {
      console.error('Error finding recent transactions:', error);
      throw new Error('Failed to find recent transactions');
    }
  }

  /**
   * Execute multiple operations in a transaction
   */
  async executeInTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    return await db.transaction(callback);
  }

  /**
   * Find transaction by AllPay transaction ID
   */
  async findByAllPayId(allpayTransactionId: string): Promise<Transaction | null> {
    const query = `
      SELECT 
        id,
        user_id as "userId",
        amount,
        currency,
        payment_url as "paymentUrl",
        allpay_transaction_id as "allpayTransactionId",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM transactions 
      WHERE allpay_transaction_id = $1
    `;

    try {
      const result = await db.queryOne<Transaction>(query, [allpayTransactionId]);
      if (result) {
        result.amount = parseFloat(result.amount as any);
      }
      return result;
    } catch (error) {
      console.error('Error finding transaction by AllPay ID:', error);
      throw new Error('Failed to find transaction');
    }
  }

  /**
   * Find transactions by user ID within date range
   */
  async findByUserIdInDateRange(userId: string, startDate: Date, endDate: Date): Promise<Transaction[]> {
    const query = `
      SELECT 
        id,
        user_id as "userId",
        amount,
        currency,
        payment_url as "paymentUrl",
        allpay_transaction_id as "allpayTransactionId",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM transactions 
      WHERE user_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
      ORDER BY created_at DESC
    `;

    try {
      const result = await db.query<Transaction>(query, [userId, startDate, endDate]);
      // Convert amounts from strings to numbers
      result.rows.forEach(row => {
        row.amount = parseFloat(row.amount as any);
      });
      return result.rows;
    } catch (error) {
      console.error('Error finding transactions by date range:', error);
      throw new Error('Failed to find transactions');
    }
  }

  /**
   * Get transaction statistics for a user
   */
  async getTransactionStats(userId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    failed: number;
    cancelled: number;
    totalAmount: number;
    completedAmount: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed_amount
      FROM transactions 
      WHERE user_id = $1
    `;

    try {
      const result = await db.queryOne<{
        total: string;
        completed: string;
        pending: string;
        failed: string;
        cancelled: string;
        total_amount: string;
        completed_amount: string;
      }>(query, [userId]);

      return {
        total: parseInt(result?.total || '0', 10),
        completed: parseInt(result?.completed || '0', 10),
        pending: parseInt(result?.pending || '0', 10),
        failed: parseInt(result?.failed || '0', 10),
        cancelled: parseInt(result?.cancelled || '0', 10),
        totalAmount: parseFloat(result?.total_amount || '0'),
        completedAmount: parseFloat(result?.completed_amount || '0')
      };
    } catch (error) {
      console.error('Error getting transaction stats:', error);
      throw new Error('Failed to get transaction statistics');
    }
  }
}

// Export singleton instance
export const transactionRepository = new PostgresTransactionRepository();