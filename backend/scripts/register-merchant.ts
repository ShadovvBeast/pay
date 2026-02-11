#!/usr/bin/env bun
/**
 * Script to register a new merchant account and generate API key
 * Usage: bun run backend/scripts/register-merchant.ts
 */

import { db } from '../services/database.js';
import { apiKeyService } from '../services/apiKey.js';
import { userRepository } from '../services/repository.js';
import { hashPassword } from '../utils/password.js';
import type { CreateApiKeyData } from '../types/index.js';

async function registerMerchant() {
  try {
    console.log('🏪 SB0 Pay - Merchant Registration');
    console.log('==================================');
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

    // Merchant details (you can modify these or make them interactive)
    const merchantData = {
      email: 'merchant@empaako.com',
      password: 'SecurePassword123!', // Change this!
      shopName: 'Empaako E-commerce',
      ownerName: 'Empaako Owner',
      merchantConfig: {
        currency: 'ILS',
        maxPaymentAmount: 50000,
        minPaymentAmount: 1,
        allowInstallments: true,
        maxInstallments: 12,
        allowRefunds: true,
        webhookUrl: null,
        successUrl: null,
        cancelUrl: null
      }
    };

    console.log('📝 Merchant Details:');
    console.log('  Email:', merchantData.email);
    console.log('  Shop Name:', merchantData.shopName);
    console.log('  Owner Name:', merchantData.ownerName);
    console.log('  Currency:', merchantData.merchantConfig.currency);
    console.log('');

    // Check if user already exists
    console.log('🔍 Checking if merchant already exists...');
    const existingUser = await userRepository.findByEmail(merchantData.email);
    
    let userId: string;
    
    if (existingUser) {
      console.log('✅ Merchant account already exists');
      console.log('  User ID:', existingUser.id);
      userId = existingUser.id;
    } else {
      console.log('📝 Creating new merchant account...');
      
      // Hash password
      const passwordHash = await hashPassword(merchantData.password);
      
      // Create user
      const query = `
        INSERT INTO users (email, password_hash, shop_name, owner_name, merchant_config)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, shop_name, owner_name, merchant_config, created_at
      `;
      
      const result = await db.query(query, [
        merchantData.email,
        passwordHash,
        merchantData.shopName,
        merchantData.ownerName,
        JSON.stringify(merchantData.merchantConfig)
      ]);
      
      if (result.rows.length === 0) {
        throw new Error('Failed to create merchant account');
      }
      
      const newUser = result.rows[0];
      userId = newUser.id;
      
      console.log('✅ Merchant account created successfully');
      console.log('  User ID:', userId);
    }
    
    console.log('');

    // Generate API key
    console.log('🔑 Generating API key...');
    
    const apiKeyData: CreateApiKeyData = {
      userId: userId,
      name: 'Production API Key',
      permissions: [
        {
          resource: 'payments',
          actions: ['create', 'read', 'update']
        }
      ],
      expiresAt: null // Never expires
    };

    const { apiKey, key } = await apiKeyService.createApiKey(apiKeyData);
    
    console.log('✅ API key generated successfully!');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔐 YOUR API KEY (Save this securely - it won\'t be shown again!)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log(key);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('API Key Details:');
    console.log('  ID:', apiKey.id);
    console.log('  Name:', apiKey.name);
    console.log('  Prefix:', apiKey.prefix);
    console.log('  Created:', apiKey.createdAt);
    console.log('');
    console.log('Permissions:');
    apiKey.permissions.forEach(perm => {
      console.log(`  - ${perm.resource}: ${perm.actions.join(', ')}`);
    });
    console.log('');
    console.log('📚 API Documentation:');
    console.log('  Base URL: https://sb0pay-678576192331.us-central1.run.app/api/v1');
    console.log('  Docs: https://sb0pay-678576192331.us-central1.run.app/docs');
    console.log('');
    console.log('Example Usage:');
    console.log('');
    console.log('curl -X POST https://sb0pay-678576192331.us-central1.run.app/api/v1/payments \\');
    console.log('  -H "Authorization: Bearer ' + key + '" \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{');
    console.log('    "amount": 100.00,');
    console.log('    "description": "Test Payment",');
    console.log('    "lineItems": [');
    console.log('      {');
    console.log('        "name": "Product 1",');
    console.log('        "price": 100.00,');
    console.log('        "quantity": 1');
    console.log('      }');
    console.log('    ],');
    console.log('    "customerEmail": "customer@example.com",');
    console.log('    "maxInstallments": 12');
    console.log('  }\'');
    console.log('');

  } catch (error) {
    console.error('❌ Error registering merchant:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

registerMerchant();
