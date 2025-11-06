import { db } from './database.js';
import { hashPassword } from '../utils/password.js';
import type { ApiKey, CreateApiKeyData, ApiKeyPermission } from '../types/index.js';
import crypto from 'crypto';

/**
 * API Key Service
 * Handles API key generation, validation, and management
 */
class ApiKeyService {
  
  /**
   * Generate a new API key
   */
  generateApiKey(): string {
    // Format: sb0_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (40 chars total)
    const randomBytes = crypto.randomBytes(16);
    const keyPart = randomBytes.toString('hex'); // 32 chars
    return `sb0_live_${keyPart}`;
  }

  /**
   * Get key prefix for identification
   */
  getKeyPrefix(key: string): string {
    return key.substring(0, 16); // "sb0_live_12345678"
  }

  /**
   * Hash API key for secure storage
   */
  async hashApiKey(key: string): Promise<string> {
    return await hashPassword(key);
  }

  /**
   * Create a new API key
   */
  async createApiKey(data: CreateApiKeyData): Promise<{ apiKey: ApiKey; key: string }> {
    const key = this.generateApiKey();
    const keyHash = await this.hashApiKey(key);
    const prefix = this.getKeyPrefix(key);

    const query = `
      INSERT INTO api_keys (user_id, name, key_hash, prefix, permissions, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await db.query(query, [
      data.userId,
      data.name,
      keyHash,
      prefix,
      JSON.stringify(data.permissions),
      data.expiresAt
    ]);

    const apiKey: ApiKey = {
      ...result.rows[0],
      permissions: JSON.parse(result.rows[0].permissions)
    };

    return { apiKey, key };
  }

  /**
   * Validate API key and return associated data
   */
  async validateApiKey(key: string): Promise<{ isValid: boolean; apiKey?: ApiKey; error?: string }> {
    try {
      if (!key || !key.startsWith('sb0_live_')) {
        return { isValid: false, error: 'Invalid API key format' };
      }

      const prefix = this.getKeyPrefix(key);
      
      const query = `
        SELECT ak.*, u.id as user_id, u.email, u.shop_name, u.owner_name, u.merchant_config
        FROM api_keys ak
        JOIN users u ON ak.user_id = u.id
        WHERE ak.prefix = $1 AND ak.is_active = true
      `;

      const result = await db.query(query, [prefix]);

      if (result.rows.length === 0) {
        return { isValid: false, error: 'API key not found' };
      }

      const apiKeyData = result.rows[0];

      // Check if key is expired
      if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
        return { isValid: false, error: 'API key has expired' };
      }

      // Verify the actual key hash
      const bcrypt = await import('bcrypt');
      const isKeyValid = await bcrypt.compare(key, apiKeyData.key_hash);

      if (!isKeyValid) {
        return { isValid: false, error: 'Invalid API key' };
      }

      // Update last used timestamp
      await this.updateLastUsed(apiKeyData.id);

      const apiKey: ApiKey = {
        id: apiKeyData.id,
        userId: apiKeyData.user_id,
        name: apiKeyData.name,
        keyHash: apiKeyData.key_hash,
        prefix: apiKeyData.prefix,
        permissions: JSON.parse(apiKeyData.permissions),
        isActive: apiKeyData.is_active,
        lastUsedAt: apiKeyData.last_used_at,
        expiresAt: apiKeyData.expires_at,
        createdAt: apiKeyData.created_at,
        updatedAt: apiKeyData.updated_at
      };

      return { isValid: true, apiKey };

    } catch (error) {
      console.error('API key validation error:', error);
      return { isValid: false, error: 'Failed to validate API key' };
    }
  }

  /**
   * Check if API key has permission for a specific action
   */
  hasPermission(apiKey: ApiKey, resource: string, action: string): boolean {
    return apiKey.permissions.some(permission => 
      permission.resource === resource && permission.actions.includes(action as any)
    );
  }

  /**
   * Get all API keys for a user
   */
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    const query = `
      SELECT * FROM api_keys 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [userId]);

    return result.rows.map(row => ({
      ...row,
      permissions: JSON.parse(row.permissions)
    }));
  }

  /**
   * Update API key
   */
  async updateApiKey(keyId: string, userId: string, updates: Partial<Pick<ApiKey, 'name' | 'permissions' | 'isActive' | 'expiresAt'>>): Promise<ApiKey | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.permissions !== undefined) {
      setClauses.push(`permissions = $${paramIndex++}`);
      values.push(JSON.stringify(updates.permissions));
    }

    if (updates.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    if (updates.expiresAt !== undefined) {
      setClauses.push(`expires_at = $${paramIndex++}`);
      values.push(updates.expiresAt);
    }

    if (setClauses.length === 0) {
      return null;
    }

    values.push(keyId, userId);

    const query = `
      UPDATE api_keys 
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      ...result.rows[0],
      permissions: JSON.parse(result.rows[0].permissions)
    };
  }

  /**
   * Delete API key
   */
  async deleteApiKey(keyId: string, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM api_keys 
      WHERE id = $1 AND user_id = $2
    `;

    const result = await db.query(query, [keyId, userId]);
    return result.rowCount > 0;
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(keyId: string): Promise<void> {
    const query = `
      UPDATE api_keys 
      SET last_used_at = NOW() 
      WHERE id = $1
    `;

    await db.query(query, [keyId]);
  }

  /**
   * Log API key usage
   */
  async logUsage(apiKeyId: string, endpoint: string, method: string, statusCode: number, ipAddress?: string, userAgent?: string, requestId?: string): Promise<void> {
    const query = `
      INSERT INTO api_key_usage_logs (api_key_id, endpoint, method, status_code, ip_address, user_agent, request_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await db.query(query, [apiKeyId, endpoint, method, statusCode, ipAddress, userAgent, requestId]);
  }

  /**
   * Get usage statistics for an API key
   */
  async getUsageStats(apiKeyId: string, days: number = 30): Promise<{
    totalRequests: number;
    successfulRequests: number;
    errorRequests: number;
    dailyStats: Array<{ date: string; requests: number; errors: number }>;
  }> {
    const totalQuery = `
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status_code < 400 THEN 1 END) as successful_requests,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_requests
      FROM api_key_usage_logs 
      WHERE api_key_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
    `;

    const dailyQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as requests,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as errors
      FROM api_key_usage_logs 
      WHERE api_key_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const [totalResult, dailyResult] = await Promise.all([
      db.query(totalQuery, [apiKeyId]),
      db.query(dailyQuery, [apiKeyId])
    ]);

    return {
      totalRequests: parseInt(totalResult.rows[0]?.total_requests || '0'),
      successfulRequests: parseInt(totalResult.rows[0]?.successful_requests || '0'),
      errorRequests: parseInt(totalResult.rows[0]?.error_requests || '0'),
      dailyStats: dailyResult.rows.map(row => ({
        date: row.date,
        requests: parseInt(row.requests),
        errors: parseInt(row.errors)
      }))
    };
  }
}

export const apiKeyService = new ApiKeyService();