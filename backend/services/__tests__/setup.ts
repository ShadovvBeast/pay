// Test setup and utilities
import { db } from '../database';

export async function setupTestDatabase() {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.TEST_DB_PORT || '5432';
  process.env.DB_NAME = process.env.TEST_DB_NAME || 'sb0_pay_test';
  process.env.DB_USER = process.env.TEST_DB_USER || 'postgres';
  process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'password';

  try {
    await db.initialize();
    console.log('Test database initialized');
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  }
}

export async function cleanupTestDatabase() {
  try {
    await db.query('TRUNCATE TABLE transactions, users RESTART IDENTITY CASCADE');
  } catch (error) {
    // Ignore errors if tables don't exist
  }
}

export async function teardownTestDatabase() {
  try {
    await db.close();
    console.log('Test database connections closed');
  } catch (error) {
    console.error('Error closing test database:', error);
  }
}