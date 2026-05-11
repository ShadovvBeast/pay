import { db } from '../services/database.js';

async function main() {
  await db.initialize();
  
  // Fix kikomeko's wallet currency to USD (matches their merchant config)
  await db.query(
    `UPDATE wallets SET currency = 'USD' 
     WHERE user_id = (SELECT id FROM users WHERE email = 'kikomekobashir29@gmail.com')`
  );

  console.log('Wallet currency updated to USD');
  await db.close();
}

main().catch(console.error);
