#!/usr/bin/env bun
/**
 * Script to diagnose production database and API key setup
 * Usage: bun run backend/scripts/diagnose-production.ts
 */

import { db } from '../services/database.js';

async function diagnoseProduction() {
  try {
    console.log('🔍 SB0 Pay Production Diagnostics');
    console.log('==================================');
    console.log('');

    // Check environment
    console.log('📋 Environment Configuration:');
    console.log('  NODE_ENV:', process.env.NODE_ENV || 'not set');
    console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
    console.log('  ALLPAY_API_URL:', process.env.ALLPAY_API_URL || 'using default');
    console.log('  ALLPAY_LOGIN:', process.env.ALLPAY_LOGIN ? '✅ Set' : '❌ Not set');
    console.log('  ALLPAY_API_KEY:', process.env.ALLPAY_API_KEY ? '✅ Set' : '❌ Not set');
    console.log('');

    // Test database connection
    console.log('📡 Testing database connection...');
    const isConnected = await db.testConnection();
    
    if (!isConnected) {
      console.error('❌ Failed to connect to database');
      console.error('');
      console.error('Please set the DATABASE_URL environment variable:');
      console.error('  export DATABASE_URL="postgresql://user:password@host:port/database"');
      console.error('');
      process.exit(1);
    }
    
    console.log('✅ Database connection successful');
    console.log('');

    // Check database tables
    console.log('📊 Checking database schema...');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    const tablesResult = await db.query(tablesQuery);
    
    console.log('Tables found:', tablesResult.rows.length);
    tablesResult.rows.forEach(row => {
      console.log('  -', row.table_name);
    });
    console.log('');

    // Check if required tables exist
    const requiredTables = ['users', 'api_keys', 'transactions', 'api_key_usage_logs'];
    const existingTables = tablesResult.rows.map(row => row.table_name);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('⚠️  Missing required tables:', missingTables.join(', '));
      console.log('');
      console.log('Run migrations to create missing tables:');
      console.log('  cd backend && bun run index.ts');
      console.log('');
    } else {
      console.log('✅ All required tables exist');
      console.log('');
    }

    // Check users
    console.log('👥 Checking users...');
    const usersQuery = 'SELECT id, email, shop_name, owner_name, created_at FROM users ORDER BY created_at DESC LIMIT 10';
    const usersResult = await db.query(usersQuery);
    
    console.log('Total users:', usersResult.rows.length);
    if (usersResult.rows.length > 0) {
      console.log('');
      console.log('Recent users:');
      usersResult.rows.forEach(user => {
        console.log(`  - ${user.email} (${user.shop_name})`);
        console.log(`    ID: ${user.id}`);
        console.log(`    Created: ${user.created_at}`);
      });
    } else {
      console.log('⚠️  No users found in database');
      console.log('You need to register a merchant account first');
    }
    console.log('');

    // Check API keys
    console.log('🔑 Checking API keys...');
    const apiKeysQuery = `
      SELECT 
        ak.id, 
        ak.name, 
        ak.prefix, 
        ak.is_active, 
        ak.last_used_at, 
        ak.expires_at,
        ak.created_at,
        u.email as user_email,
        u.shop_name
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
      ORDER BY ak.created_at DESC
      LIMIT 10
    `;
    const apiKeysResult = await db.query(apiKeysQuery);
    
    console.log('Total API keys:', apiKeysResult.rows.length);
    if (apiKeysResult.rows.length > 0) {
      console.log('');
      console.log('API Keys:');
      apiKeysResult.rows.forEach(key => {
        const status = key.is_active ? '✅ Active' : '❌ Inactive';
        const expired = key.expires_at && new Date(key.expires_at) < new Date() ? '⚠️  EXPIRED' : '';
        console.log(`  ${status} ${expired}`);
        console.log(`    Name: ${key.name}`);
        console.log(`    Prefix: ${key.prefix}`);
        console.log(`    User: ${key.user_email} (${key.shop_name})`);
        console.log(`    Last Used: ${key.last_used_at || 'Never'}`);
        console.log(`    Expires: ${key.expires_at || 'Never'}`);
        console.log(`    Created: ${key.created_at}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No API keys found in database');
      console.log('You need to generate an API key');
    }
    console.log('');

    // Check for the specific API key
    const targetKey = 'sb0_live_0b6bf256';
    console.log(`🔍 Checking for API key with prefix: ${targetKey}...`);
    const specificKeyQuery = `
      SELECT 
        ak.*,
        u.email as user_email,
        u.shop_name
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
      WHERE ak.prefix = $1
    `;
    const specificKeyResult = await db.query(specificKeyQuery, [targetKey]);
    
    if (specificKeyResult.rows.length > 0) {
      const key = specificKeyResult.rows[0];
      console.log('✅ API key found!');
      console.log('  Name:', key.name);
      console.log('  Active:', key.is_active);
      console.log('  User:', key.user_email);
      console.log('  Shop:', key.shop_name);
      console.log('  Last Used:', key.last_used_at || 'Never');
      console.log('  Expires:', key.expires_at || 'Never');
      
      if (!key.is_active) {
        console.log('');
        console.log('⚠️  This API key is INACTIVE');
        console.log('You need to activate it or generate a new one');
      }
      
      if (key.expires_at && new Date(key.expires_at) < new Date()) {
        console.log('');
        console.log('⚠️  This API key has EXPIRED');
        console.log('You need to generate a new one');
      }
    } else {
      console.log('❌ API key NOT found in database');
      console.log('');
      console.log('This API key needs to be registered.');
      console.log('Run: bun run scripts/register-merchant.ts');
    }
    console.log('');

    // Check transactions
    console.log('💳 Checking transactions...');
    const transactionsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
      FROM transactions
    `;
    const transactionsResult = await db.query(transactionsQuery);
    
    if (transactionsResult.rows.length > 0) {
      const stats = transactionsResult.rows[0];
      console.log('Transaction Statistics:');
      console.log('  Total:', stats.total);
      console.log('  Pending:', stats.pending);
      console.log('  Completed:', stats.completed);
      console.log('  Failed:', stats.failed);
      console.log('  Cancelled:', stats.cancelled);
    }
    console.log('');

    // Check API usage logs
    console.log('📊 Checking API usage logs...');
    const usageQuery = `
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status_code < 400 THEN 1 END) as successful,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as errors,
        MAX(created_at) as last_request
      FROM api_key_usage_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `;
    const usageResult = await db.query(usageQuery);
    
    if (usageResult.rows.length > 0) {
      const usage = usageResult.rows[0];
      console.log('API Usage (Last 7 days):');
      console.log('  Total Requests:', usage.total_requests);
      console.log('  Successful:', usage.successful);
      console.log('  Errors:', usage.errors);
      console.log('  Last Request:', usage.last_request || 'None');
    }
    console.log('');

    // Summary and recommendations
    console.log('═══════════════════════════════════════');
    console.log('📋 Summary & Recommendations');
    console.log('═══════════════════════════════════════');
    console.log('');
    
    if (usersResult.rows.length === 0) {
      console.log('❌ No merchant accounts found');
      console.log('   → Run: bun run scripts/register-merchant.ts');
      console.log('');
    }
    
    if (apiKeysResult.rows.length === 0) {
      console.log('❌ No API keys found');
      console.log('   → Run: bun run scripts/register-merchant.ts');
      console.log('');
    }
    
    if (specificKeyResult.rows.length === 0) {
      console.log('❌ Your API key (sb0_live_0b6bf256...) is not registered');
      console.log('   → Run: bun run scripts/register-merchant.ts');
      console.log('   → Or use the web interface to generate a new key');
      console.log('');
    }
    
    if (usersResult.rows.length > 0 && apiKeysResult.rows.length > 0) {
      console.log('✅ System is set up correctly');
      console.log('   → Test your API key: bun run scripts/test-api-payment.ts YOUR_KEY');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error during diagnostics:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

diagnoseProduction();
