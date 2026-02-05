import { db } from './database';
import type { User, Transaction, CreateUserData, CreateTransactionData, MerchantConfig } from '../types/index.js';

export class UserRepository {
  /**
   * Create a new user
   */
  public async create(userData: CreateUserData): Promise<User> {
    const query = `
      INSERT INTO users (email, password_hash, shop_name, owner_name, merchant_config)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, password_hash, shop_name, owner_name, merchant_config, created_at, updated_at
    `;
    
    const values = [
      userData.email,
      userData.password, // This should be hashed before calling this method
      userData.shopName,
      userData.ownerName,
      JSON.stringify(userData.merchantConfig)
    ];

    const result = await db.queryOne<any>(query, values);
    if (!result) {
      throw new Error('Failed to create user');
    }

    // Map snake_case to camelCase and parse JSON
    return this.mapUserFromDb(result);
  }

  /**
   * Map database row to User interface
   */
  private mapUserFromDb(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      shopName: row.shop_name,
      ownerName: row.owner_name,
      merchantConfig: typeof row.merchant_config === 'string' 
        ? JSON.parse(row.merchant_config) 
        : row.merchant_config,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Find user by email
   */
  public async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash, shop_name, owner_name, merchant_config, created_at, updated_at
      FROM users
      WHERE email = $1
    `;

    const result = await db.queryOne<any>(query, [email]);
    if (!result) {
      return null;
    }

    return this.mapUserFromDb(result);
  }

  /**
   * Find user by ID
   */
  public async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash, shop_name, owner_name, merchant_config, created_at, updated_at
      FROM users
      WHERE id = $1
    `;

    const result = await db.queryOne<any>(query, [id]);
    if (!result) {
      return null;
    }

    return this.mapUserFromDb(result);
  }

  /**
   * Update user fields (partial update)
   */
  public async update(
    userId: string,
    data: Partial<Pick<User, 'email' | 'shopName' | 'ownerName' | 'merchantConfig'>>
  ): Promise<User | null> {
    const query = `
      UPDATE users
      SET
        email = COALESCE($2, email),
        shop_name = COALESCE($3, shop_name),
        owner_name = COALESCE($4, owner_name),
        merchant_config = COALESCE($5, merchant_config),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, password_hash, shop_name, owner_name, merchant_config, created_at, updated_at
    `;

    const merchantConfigValue =
      typeof data.merchantConfig === 'undefined'
        ? undefined
        : JSON.stringify(data.merchantConfig);

    const values = [
      userId,
      typeof data.email === 'undefined' ? undefined : data.email,
      typeof data.shopName === 'undefined' ? undefined : data.shopName,
      typeof data.ownerName === 'undefined' ? undefined : data.ownerName,
      merchantConfigValue
    ];

    const result = await db.queryOne<any>(query, values);
    if (!result) {
      return null;
    }

    return this.mapUserFromDb(result);
  }

  /**
   * Update user merchant configuration
   */
  public async updateMerchantConfig(userId: string, merchantConfig: MerchantConfig): Promise<User | null> {
    const query = `
      UPDATE users 
      SET merchant_config = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, password_hash, shop_name, owner_name, merchant_config, created_at, updated_at
    `;

    const result = await db.queryOne<any>(query, [userId, JSON.stringify(merchantConfig)]);
    if (!result) {
      return null;
    }

    return this.mapUserFromDb(result);
  }

  /**
   * Delete user by ID
   */
  public async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }
}

export class TransactionRepository {
  /**
   * Create a new transaction
   */
  public async create(transactionData: CreateTransactionData): Promise<Transaction> {
    const query = `
      INSERT INTO transactions (
        user_id, amount, currency, payment_url, allpay_transaction_id,
        description, customer_email, customer_name, customer_phone,
        success_url, cancel_url, webhook_url, metadata, api_key_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      transactionData.userId,
      transactionData.amount,
      transactionData.currency,
      transactionData.paymentUrl,
      transactionData.allpayTransactionId || null,
      transactionData.description || null,
      transactionData.customerEmail || null,
      transactionData.customerName || null,
      transactionData.customerPhone || null,
      transactionData.successUrl || null,
      transactionData.cancelUrl || null,
      transactionData.webhookUrl || null,
      transactionData.metadata ? JSON.stringify(transactionData.metadata) : null,
      transactionData.apiKeyId || null
    ];

    const result = await db.queryOne<any>(query, values);
    if (!result) {
      throw new Error('Failed to create transaction');
    }

    return this.mapTransactionFromDb(result);
  }

  /**
   * Map database row to Transaction interface
   */
  private mapTransactionFromDb(row: any): Transaction {
    return {
      id: row.id,
      userId: row.user_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      paymentUrl: row.payment_url,
      allpayTransactionId: row.allpay_transaction_id,
      status: row.status,
      description: row.description,
      customerEmail: row.customer_email,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      successUrl: row.success_url,
      cancelUrl: row.cancel_url,
      webhookUrl: row.webhook_url,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      apiKeyId: row.api_key_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Find transaction by ID
   */
  public async findById(id: string): Promise<Transaction | null> {
    const query = `
      SELECT *
      FROM transactions
      WHERE id = $1
    `;

    const result = await db.queryOne<any>(query, [id]);
    if (!result) {
      return null;
    }

    return this.mapTransactionFromDb(result);
  }

  /**
   * Find transaction by AllPay transaction ID
   */
  public async findByAllPayId(allpayTransactionId: string): Promise<Transaction | null> {
    const query = `
      SELECT *
      FROM transactions
      WHERE allpay_transaction_id = $1
    `;

    const result = await db.queryOne<any>(query, [allpayTransactionId]);
    if (!result) {
      return null;
    }

    return this.mapTransactionFromDb(result);
  }

  /**
   * Update transaction status
   */
  public async updateStatus(id: string, status: Transaction['status']): Promise<Transaction | null> {
    const query = `
      UPDATE transactions 
      SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.queryOne<any>(query, [id, status]);
    if (!result) {
      return null;
    }

    return this.mapTransactionFromDb(result);
  }

  /**
   * Update AllPay transaction ID
   */
  public async updateAllPayId(id: string, allpayTransactionId: string): Promise<Transaction | null> {
    const query = `
      UPDATE transactions 
      SET allpay_transaction_id = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, user_id, amount, currency, payment_url, allpay_transaction_id, status, created_at, updated_at
    `;

    const result = await db.queryOne<any>(query, [id, allpayTransactionId]);
    if (!result) {
      return null;
    }

    return this.mapTransactionFromDb(result);
  }

  /**
   * Get transactions by user ID with pagination
   */
  public async findByUserId(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<Transaction[]> {
    const query = `
      SELECT id, user_id, amount, currency, payment_url, allpay_transaction_id, status, created_at, updated_at
      FROM transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query<any>(query, [userId, limit, offset]);
    return result.rows.map(row => this.mapTransactionFromDb(row));
  }

  /**
   * Get transaction count by user ID
   */
  public async countByUserId(userId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM transactions WHERE user_id = $1';
    const result = await db.queryOne<{ count: string }>(query, [userId]);
    return parseInt(result?.count || '0');
  }

  /**
   * Get transactions by status
   */
  public async findByStatus(status: Transaction['status'], limit: number = 100): Promise<Transaction[]> {
    const query = `
      SELECT id, user_id, amount, currency, payment_url, allpay_transaction_id, status, created_at, updated_at
      FROM transactions
      WHERE status = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await db.query<any>(query, [status, limit]);
    return result.rows.map(row => this.mapTransactionFromDb(row));
  }

  /**
   * Get transactions by user ID within date range
   */
  public async findByUserIdInDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Transaction[]> {
    const query = `
      SELECT id, user_id, amount, currency, payment_url, allpay_transaction_id, status, created_at, updated_at
      FROM transactions
      WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3
      ORDER BY created_at DESC
    `;

    const result = await db.query<any>(query, [userId, startDate, endDate]);
    return result.rows.map(row => this.mapTransactionFromDb(row));
  }

  /**
   * Delete transaction by ID
   */
  public async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM transactions WHERE id = $1';
    const result = await db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }
}

// Export repository instances
export const userRepository = new UserRepository();
export const transactionRepository = new TransactionRepository();