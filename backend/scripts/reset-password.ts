/**
 * Reset password for a user in the database
 * Usage: bun run scripts/reset-password.ts <email> <new-password>
 */
import { Pool } from 'pg';

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error('Usage: bun run scripts/reset-password.ts <email> <new-password>');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      console.error(`User with email "${email}" not found`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`Found user: ${user.email} (id: ${user.id})`);
    console.log(`Current hash prefix: ${user.password_hash?.substring(0, 20)}...`);

    // Hash the new password using Bun's built-in Argon2id
    const hashedPassword = await Bun.password.hash(newPassword, {
      algorithm: 'argon2id',
    });

    console.log(`New hash prefix: ${hashedPassword.substring(0, 20)}...`);

    // Update the password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    );

    console.log(`✅ Password updated successfully for ${email}`);

    // Verify the new password works
    const isValid = await Bun.password.verify(newPassword, hashedPassword);
    console.log(`Verification check: ${isValid ? '✅ PASS' : '❌ FAIL'}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
