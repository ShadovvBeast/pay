/**
 * One-time script: Create a completed payment record for musiimebderrick@gmail.com
 * and credit their wallet with 571,000 UGX, backdated to 20 April 2026.
 */
import { db } from '../services/database.js';
import { walletService } from '../services/wallet.js';

async function main() {
  await db.initialize();

  // Find the user
  const user = await db.queryOne<{ id: string; merchant_config: any }>(
    `SELECT id, merchant_config FROM users WHERE email = $1`,
    ['kikomekobashir29@gmail.com']
  );

  if (!user) {
    console.error('User not found');
    process.exit(1);
  }

  console.log('Found user:', user.id);

  const paymentDate = '2026-04-20T12:00:00.000Z';

  // Insert a completed transaction record
  const tx = await db.queryOne<{ id: string }>(
    `INSERT INTO transactions (
      user_id, amount, currency, payment_url, status,
      payment_method, payment_provider, description,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8,
      $9, $9
    ) RETURNING id`,
    [
      user.id,
      571000,
      'UGX',
      'https://allpay.to/completed',
      'completed',
      'card',
      'allpay',
      'Payment from non',
      paymentDate,
    ]
  );

  console.log('Created transaction:', tx?.id);

  // Credit the wallet
  const walletTx = await walletService.credit(
    user.id,
    571000,
    'payment',
    tx?.id,
    'Payment received - non'
  );

  console.log('Wallet credited:', walletTx);

  // Backdate the wallet transaction to match
  await db.query(
    `UPDATE wallet_transactions SET created_at = $1 WHERE id = $2`,
    [paymentDate, walletTx.id]
  );

  console.log('Done! Payment of 571,000 UGX created and wallet credited.');
  await db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
