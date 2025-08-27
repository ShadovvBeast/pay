#!/usr/bin/env bun

import { db } from '../backend/services/database';

const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case 'init':
        console.log('Initializing database...');
        await db.initialize();
        console.log('✅ Database initialized successfully');
        break;
        
      case 'migrate':
        console.log('Running migrations...');
        await db.runMigrations();
        console.log('✅ Migrations completed successfully');
        break;
        
      case 'status':
        console.log('Checking database status...');
        const isConnected = await db.testConnection();
        const status = db.getConnectionStatus();
        
        console.log('Database Status:');
        console.log(`  Connected: ${isConnected ? '✅' : '❌'}`);
        console.log(`  Total Connections: ${status.totalCount}`);
        console.log(`  Idle Connections: ${status.idleCount}`);
        console.log(`  Waiting Connections: ${status.waitingCount}`);
        break;
        
      case 'reset':
        console.log('⚠️  Resetting database (this will delete all data)...');
        await db.query('DROP SCHEMA public CASCADE');
        await db.query('CREATE SCHEMA public');
        await db.query('GRANT ALL ON SCHEMA public TO postgres');
        await db.query('GRANT ALL ON SCHEMA public TO public');
        await db.runMigrations();
        console.log('✅ Database reset completed');
        break;
        
      default:
        console.log('SB0 Pay Database CLI');
        console.log('');
        console.log('Usage: bun scripts/db-cli.ts <command>');
        console.log('');
        console.log('Commands:');
        console.log('  init     Initialize database connection and run migrations');
        console.log('  migrate  Run pending migrations');
        console.log('  status   Check database connection status');
        console.log('  reset    Reset database (WARNING: deletes all data)');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();