import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { DatabaseService } from '../database';

// Test database configuration
const testConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'sb0_pay_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'password',
};

describe('DatabaseService', () => {
  let db: DatabaseService;

  beforeAll(async () => {
    // Override config for testing
    process.env.DB_HOST = testConfig.host;
    process.env.DB_PORT = testConfig.port.toString();
    process.env.DB_NAME = testConfig.database;
    process.env.DB_USER = testConfig.user;
    process.env.DB_PASSWORD = testConfig.password;

    db = DatabaseService.getInstance();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    try {
      await db.query('TRUNCATE TABLE transactions, users RESTART IDENTITY CASCADE');
    } catch (error) {
      // Tables might not exist yet, ignore error
    }
  });

  describe('Connection Management', () => {
    it('should establish database connection', async () => {
      const isConnected = await db.testConnection();
      expect(isConnected).toBe(true);
    });

    it('should return connection status', () => {
      const status = db.getConnectionStatus();
      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('totalCount');
      expect(status).toHaveProperty('idleCount');
      expect(status).toHaveProperty('waitingCount');
      expect(typeof status.totalCount).toBe('number');
    });
  });

  describe('Query Operations', () => {
    it('should execute basic queries', async () => {
      const result = await db.query('SELECT NOW() as current_time');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toHaveProperty('current_time');
    });

    it('should execute parameterized queries', async () => {
      const result = await db.query('SELECT $1 as test_value', ['hello']);
      expect(result.rows[0].test_value).toBe('hello');
    });

    it('should return single row with queryOne', async () => {
      const result = await db.queryOne('SELECT $1 as test_value', ['single']);
      expect(result?.test_value).toBe('single');
    });

    it('should return null for queryOne with no results', async () => {
      const result = await db.queryOne('SELECT * FROM users WHERE email = $1', ['non-existent@example.com']);
      expect(result).toBeNull();
    });
  });

  describe('Transaction Management', () => {
    it('should execute successful transactions', async () => {
      await db.runMigrations(); // Ensure tables exist

      const result = await db.transaction(async (client) => {
        await client.query(`
          INSERT INTO users (email, password_hash, shop_name, owner_name, merchant_config)
          VALUES ($1, $2, $3, $4, $5)
        `, ['test@example.com', 'hashedpassword', 'Test Shop', 'Test Owner', '{}']);

        const user = await client.query('SELECT * FROM users WHERE email = $1', ['test@example.com']);
        return user.rows[0];
      });

      expect(result.email).toBe('test@example.com');
      expect(result.shop_name).toBe('Test Shop');
    });

    it('should rollback failed transactions', async () => {
      await db.runMigrations(); // Ensure tables exist

      try {
        await db.transaction(async (client) => {
          await client.query(`
            INSERT INTO users (email, password_hash, shop_name, owner_name, merchant_config)
            VALUES ($1, $2, $3, $4, $5)
          `, ['test2@example.com', 'hashedpassword', 'Test Shop 2', 'Test Owner 2', '{}']);

          // This should cause a rollback
          throw new Error('Intentional error');
        });
      } catch (error) {
        expect(error.message).toBe('Intentional error');
      }

      // Verify the user was not created due to rollback
      const user = await db.queryOne('SELECT * FROM users WHERE email = $1', ['test2@example.com']);
      expect(user).toBeNull();
    });
  });

  describe('Migration System', () => {
    it('should run migrations successfully', async () => {
      await db.runMigrations();

      // Check if tables were created
      const tablesResult = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'transactions', 'migrations')
      `);

      const tableNames = tablesResult.rows.map(row => row.table_name);
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('transactions');
      expect(tableNames).toContain('migrations');
    });

    it('should track executed migrations', async () => {
      await db.runMigrations();

      const migrations = await db.query('SELECT migration_name FROM migrations');
      expect(migrations.rows.length).toBeGreaterThan(0);
      expect(migrations.rows[0].migration_name).toBe('001_initial_schema');
    });

    it('should not re-run already executed migrations', async () => {
      await db.runMigrations();
      
      const migrationsBefore = await db.query('SELECT COUNT(*) as count FROM migrations');
      const countBefore = parseInt(migrationsBefore.rows[0].count);

      // Run migrations again
      await db.runMigrations();

      const migrationsAfter = await db.query('SELECT COUNT(*) as count FROM migrations');
      const countAfter = parseInt(migrationsAfter.rows[0].count);

      expect(countAfter).toBe(countBefore);
    });
  });

  describe('Error Handling', () => {
    it('should handle query errors gracefully', async () => {
      try {
        await db.query('SELECT * FROM non_existent_table');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain('relation "non_existent_table" does not exist');
      }
    });

    it('should handle invalid parameters', async () => {
      try {
        await db.query('SELECT $1', [undefined]);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});