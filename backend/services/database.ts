import { Pool } from 'pg';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export class DatabaseService {
  private static instance: DatabaseService;
  private pool: Pool;
  private isConnected: boolean = false;

  private constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      // Connection pool settings
      min: 2, // Minimum connections in pool
      max: 10, // Maximum connections in pool
      idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
      connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection cannot be established
      // acquireTimeoutMillis: 60000, // Return error after 60 seconds if connection cannot be acquired
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      this.isConnected = false;
    });

    // Handle pool connection
    this.pool.on('connect', () => {
      console.log('Database connection established');
      this.isConnected = true;
    });

    // Handle pool removal
    this.pool.on('remove', () => {
      console.log('Database connection removed from pool');
    });
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Test database connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Execute a query with parameters
   */
  public async query<T extends QueryResultRow = QueryResultRow>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      
      if (config.server.nodeEnv === 'development') {
        console.log('Executed query', { text: text.substring(0, 100) + '...', duration, rows: result.rowCount });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`Database query error after ${duration}ms:`, { text: text.substring(0, 100) + '...', params, error });
      throw error;
    }
  }

  /**
   * Execute a query and return the first row
   */
  public async queryOne<T extends QueryResultRow = QueryResultRow>(text: string, params?: any[]): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] || null;
  }

  /**
   * Execute multiple queries in a transaction
   */
  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run database migrations
   */
  public async runMigrations(): Promise<void> {
    try {
      console.log('Running database migrations...');
      
      // Create migrations table if it doesn't exist
      await this.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          migration_name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Get list of executed migrations
      const executedMigrations = await this.query<{ migration_name: string }>(
        'SELECT migration_name FROM migrations ORDER BY id'
      );
      
      const executedNames = new Set(executedMigrations.rows.map(row => row.migration_name));

      // Read migration files - resolve robustly regardless of CWD
      const moduleDir = dirname(fileURLToPath(import.meta.url));
      const migrationDirCandidates = [
        join(process.cwd(), 'backend', 'database', 'migrations'), // when run from repo root
        join(process.cwd(), 'database', 'migrations'),             // when run from backend/
        join(moduleDir, '..', 'database', 'migrations'),           // relative to this file
      ];
      const foundDir = migrationDirCandidates.find(p => existsSync(p));
      const migrationsDir: string = foundDir ? foundDir : migrationDirCandidates[0];
      const migrationFiles = [
        '001_initial_schema.sql',
        '002_extend_transaction_statuses.sql'
      ]; // Add more migrations here as needed

      for (const filename of migrationFiles) {
        const migrationName = filename.replace('.sql', '');
        
        if (executedNames.has(migrationName)) {
          console.log(`Migration ${migrationName} already executed, skipping`);
          continue;
        }

        console.log(`Executing migration: ${migrationName}`);
        
        try {
          const migrationPath = join(migrationsDir, filename);
          const migrationSQL = readFileSync(migrationPath, 'utf8');
          
          await this.transaction(async (client) => {
            // Execute the migration SQL
            await client.query(migrationSQL);
            // Record the migration
            await client.query(
              'INSERT INTO migrations (migration_name) VALUES ($1) ON CONFLICT (migration_name) DO NOTHING',
              [migrationName]
            );
          });
          
          console.log(`Migration ${migrationName} executed successfully`);
        } catch (error) {
          console.error(`Failed to execute migration ${migrationName}:`, error);
          throw error;
        }
      }

      console.log('All migrations completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Initialize database connection and run migrations
   */
  public async initialize(): Promise<void> {
    try {
      console.log('Initializing database connection...');
      
      // Test connection
      const isConnected = await this.testConnection();
      if (!isConnected) {
        throw new Error('Failed to establish database connection');
      }

      // Run migrations
      await this.runMigrations();
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Close all database connections
   */
  public async close(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;
      console.log('Database connections closed');
    } catch (error) {
      console.error('Error closing database connections:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): { 
    isConnected: boolean; 
    totalCount: number; 
    idleCount: number; 
    waitingCount: number; 
  } {
    return {
      isConnected: this.isConnected,
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

// Export singleton instance
export const db = DatabaseService.getInstance();