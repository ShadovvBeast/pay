/**
 * Fix kikomekobashir29@gmail.com wallet: convert 571,000 UGX to USD
 * Their wallet currency is USD, so the deposit should be in USD.
 * Rate: ~1 USD = 3,750 UGX → 571,000 / 3,750 ≈ $152.27
 */
import { db } from '../services/database.js';
import { currencyConverter } from '../services/currencyConverter.js';

async function main() {
  await db.initialize();

  // Get the conversion rate
  const { convertedAmount, rate } = await currencyConverter.convert(571000, 'UGX', 'USD');
  console.log(`571,000 UGX = $${convertedAmount} USD (rate: ${rate})`);

  // Find the user's wallet
  const wallet = await db.queryOne<{ id: string; balance: number }>(
    `SELECT w.id, w.balance FROM wallets w JOIN users u ON u.id = w.user_id WHERE u.email = $1`,
    ['kikomekobashir29@gmail.com']
  );

  if (!wallet) {
    console.error('Wallet not found');
    process.exit(1);
  }

  console.log('Current wallet balance:', wallet.balance);

  // Update wallet balance to the converted USD amount
  await db.query(
    `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
    [convertedAmount, wallet.id]
  );

  // Update the wallet transaction to reflect the converted amount
  await db.query(
    `UPDATE wallet_transactions 
     SET amount = $1, balance_after = $1, 
         description = $3
     WHERE wallet_id = $2 AND reference_type = 'payment'
     ORDER BY created_at DESC LIMIT 1`,
    [convertedAmount, wallet.id, `Payment received - non (converted from UGX 571,000 at rate ${rate.toFixed(6)})`]
  );

  // Also update the transaction record currency to show it was UGX originally
  await db.query(
    `UPDATE transactions 
     SET description = 'Payment from non (UGX 571,000)'
     WHERE user_id = (SELECT id FROM users WHERE email = 'kikomekobashir29@gmail.com')
       AND amount = 571000 AND status = 'completed'`
  );

  console.log(`Fixed! Wallet balance updated to $${convertedAmount} USD`);
  await db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
