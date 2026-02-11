#!/usr/bin/env bun
/**
 * Script to check and register API keys in the production database
 * Usage: bun run backend/scripts/check-api-key.ts <api-key>
 */

import { db } from '../services/database.js';
import { apiKeyService } from '../services/apiKey.js';
import { userRepository } from '../services/repository.js';

const API_KEY = process.argv[2];

if (!API_KEY) {
  console.error('Usage: bun run backend/scripts/check-api-key.ts <api-key>');
  process.exit(1);
}

async function checkApiKey() {
  try {
    console.log('🔍 Checking API key:', API_KEY.substring(0, 20) + '...');
    console.log('');

    // Test database connection
    console.log('📡 Testing database connection...');
    const isConnected = await db.testConnection();
    if (!isConnected) {
      console.error('❌ Failed to connect to database');
      console.error('Please check your DATABASE_URL environment variable');
      process.exit(1);
    }
    console.log('✅ Database connection successful');
    console.log('');

    // Validate the API key
    console.log('🔐 Validating API key...');
    const validation = await apiKeyService.validateApiKey(API_KEY);
    
    if (validation.isValid && validation.apiKey) {
      console.log('✅ API key is valid and active!');
      console.log('');
      console.log('API Key Details:');
      console.log('  ID:', validation.apiKey.id);
      console.log('  Name:', validation.apiKey.name);
      console.log('  User ID:', validation.apiKey.userId);
      console.log('  Prefix:', validation.apiKey.prefix);
      console.log('  Active:', validation.apiKey.isActive);
      console.log('  Last Used:', validation.apiKey.lastUsedAt || 'Never');
      console.log('  Expires:', validation.apiKey.expiresAt || 'Never');
      console.log('  Created:', validation.apiKey.createdAt);
      console.log('');
      console.log('Permissions:');
      validation.apiKey.permissions.forEach(perm => {
        console.log(`  - ${perm.resource}: ${perm.actions.join(', ')}`);
      });
      console.log('');

      // Get user details
      const user = await userRepository.findById(validation.apiKey.userId);
      if (user) {
        console.log('Associated User:');
        console.log('  Email:', user.email);
        console.log('  Shop Name:', user.shopName);
        console.log('  Owner Name:', user.ownerName);
        console.log('  Currency:', user.merchantConfig.currency);
        console.log('');
      }

      // Get usage stats
      console.log('📊 Fetching usage statistics...');
      const stats = await apiKeyService.getUsageStats(validation.apiKey.id, 30);
      console.log('Usage (Last 30 days):');
      console.log('  Total Requests:', stats.totalRequests);
      console.log('  Successful:', stats.successfulRequests);
      console.log('  Errors:', stats.errorRequests);
      console.log('');

    } else {
      console.log('❌ API key is NOT valid');
      console.log('Reason:', validation.error);
      console.log('');
      console.log('The API key may be:');
      console.log('  - Not registered in the database');
      console.log('  - Expired');
      console.log('  - Deactivated');
      console.log('  - Invalid format');
      console.log('');
      console.log('Would you like to register a new merchant account? (See register-merchant.ts)');
    }

  } catch (error) {
    console.error('❌ Error checking API key:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

checkApiKey();
