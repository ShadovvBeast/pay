// Direct production database fix
import pg from 'pg';
import { readFileSync } from 'fs';
const { Pool } = pg;

const DATABASE_URL = readFileSync('db-url.txt', 'utf8').trim();
const API_KEY = "sb0_live_0b6bf256ec92c38639a50f5183d801a5";
const PREFIX = API_KEY.substring(0, 16);

const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixApiKey() {
  try {
    console.log('🔍 Checking production database...\n');
    
    // Check if API key exists
    const checkQuery = `
      SELECT ak.*, u.email, u.shop_name 
      FROM api_keys ak 
      LEFT JOIN users u ON ak.user_id = u.id 
      WHERE ak.prefix = $1
    `;
    const checkResult = await pool.query(checkQuery, [PREFIX]);
    
    if (checkResult.rows.length > 0) {
      const key = checkResult.rows[0];
      console.log('✅ API key found!');
      console.log('  Name:', key.name);
      console.log('  Active:', key.is_active);
      console.log('  User:', key.email);
      console.log('  Shop:', key.shop_name);
      console.log('\n✅ API key is already registered and should work!');
    } else {
      console.log('❌ API key NOT found in database');
      console.log('\nCreating merchant account and registering API key...\n');
      
      // Check if user exists
      const userEmail = 'merchant@empaako.com';
      const userQuery = 'SELECT id FROM users WHERE email = $1';
      const userResult = await pool.query(userQuery, [userEmail]);
      
      let userId;
      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id;
        console.log('✅ Using existing user:', userEmail);
      } else {
        // Create user
        const bcrypt = await import('bcrypt');
        const passwordHash = await bcrypt.hash('EmpaakoPay2024!', 10);
        
        const createUserQuery = `
          INSERT INTO users (email, password_hash, shop_name, owner_name, merchant_config)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `;
        const createUserResult = await pool.query(createUserQuery, [
          userEmail,
          passwordHash,
          'Empaako E-commerce',
          'Empaako Owner',
          JSON.stringify({
            currency: 'ILS',
            maxPaymentAmount: 50000,
            minPaymentAmount: 1,
            allowInstallments: true,
            maxInstallments: 12,
            allowRefunds: true
          })
        ]);
        userId = createUserResult.rows[0].id;
        console.log('✅ Created new user:', userEmail);
      }
      
      // Hash the API key
      const bcrypt = await import('bcrypt');
      const keyHash = await bcrypt.hash(API_KEY, 10);
      
      // Insert API key
      const insertKeyQuery = `
        INSERT INTO api_keys (user_id, name, key_hash, prefix, permissions, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, prefix
      `;
      const insertResult = await pool.query(insertKeyQuery, [
        userId,
        'Production API Key',
        keyHash,
        PREFIX,
        JSON.stringify([
          { resource: 'payments', actions: ['create', 'read', 'update'] }
        ]),
        true
      ]);
      
      console.log('\n✅ API key registered successfully!');
      console.log('  ID:', insertResult.rows[0].id);
      console.log('  Name:', insertResult.rows[0].name);
      console.log('  Prefix:', insertResult.rows[0].prefix);
      console.log('\n🎉 Your API key is now active and ready to use!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

fixApiKey();
