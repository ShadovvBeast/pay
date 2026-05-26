/**
 * Crypto Wallet Service — Self-Custodial Wallet on Polygon
 * 
 * Each user gets a real Polygon wallet (address + encrypted private key).
 * The system manages keys — users only see balances.
 * 
 * Supports:
 * - MATIC (native gas token)
 * - USDT on Polygon (0xc2132D05D31c914a87C6611C10748AEb04B58e8F)
 * - USDC on Polygon (0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359)
 * 
 * Architecture:
 * - User wallets: generated per user, private keys AES-256 encrypted in DB
 * - Broker wallet: system master wallet for fiat↔crypto swaps
 * - Internal transfers: DB-level (no gas), instant
 * - External sends: sign + broadcast via Polygon RPC
 * - Deposit detection: poll user addresses or use Alchemy webhooks
 */

import * as crypto from 'crypto';
import { db } from './database.js';

// AES-256 encryption for private keys
const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || 'default-32-char-encryption-key!!'; // Must be 32 bytes
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// Polygon contract addresses (mainnet)
const POLYGON_USDT_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
const POLYGON_USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';

// ERC-20 ABI (minimal — just balanceOf and transfer)
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

export interface CryptoWalletInfo {
  address: string;
  createdAt: Date;
}

export interface CryptoBalance {
  asset: string;
  symbol: string;
  balance: string; // raw balance as string (to preserve precision)
  balanceFormatted: number; // human-readable
  contractAddress?: string;
}

export interface TransferResult {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  asset: string;
  status: 'pending' | 'confirmed';
}

// ─── Encryption Helpers ──────────────────────────────────────────────────────

function encrypt(text: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const parts = encryptedText.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// ─── Wallet Service ──────────────────────────────────────────────────────────

class CryptoWalletService {
  private rpcUrl: string;
  private brokerPrivateKey: string;
  private brokerAddress: string;
  private ethersModule: any = null;

  constructor() {
    this.rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
    this.brokerPrivateKey = process.env.BROKER_WALLET_PRIVATE_KEY || '';
    this.brokerAddress = process.env.BROKER_WALLET_ADDRESS || '';
  }

  /**
   * Lazy-load ethers.js (it's a large module)
   */
  private async getEthers() {
    if (!this.ethersModule) {
      this.ethersModule = await import('ethers');
    }
    return this.ethersModule;
  }

  /**
   * Get a JSON-RPC provider for Polygon
   */
  private async getProvider() {
    const { JsonRpcProvider } = await this.getEthers();
    return new JsonRpcProvider(this.rpcUrl);
  }

  /**
   * Check if the crypto wallet system is configured
   */
  isAvailable(): boolean {
    return !!(this.rpcUrl && this.brokerPrivateKey && this.brokerAddress);
  }

  // ─── Wallet Generation ───────────────────────────────────────────────────

  /**
   * Generate a new Polygon wallet for a user.
   * Stores encrypted private key in DB.
   * Returns only the public address.
   */
  async generateWallet(userId: string): Promise<CryptoWalletInfo> {
    const { Wallet: EthWallet } = await this.getEthers();

    // Check if user already has a crypto wallet
    const existing = await db.queryOne<{ address: string; created_at: Date }>(
      `SELECT address, created_at FROM crypto_wallets WHERE user_id = $1`,
      [userId]
    );

    if (existing) {
      return { address: existing.address, createdAt: existing.created_at };
    }

    // Generate new wallet
    const wallet = EthWallet.createRandom();
    const address = wallet.address;
    const privateKey = wallet.privateKey;

    // Encrypt private key
    const encryptedKey = encrypt(privateKey);

    // Store in DB
    await db.query(
      `INSERT INTO crypto_wallets (user_id, address, encrypted_private_key, network)
       VALUES ($1, $2, $3, 'polygon')
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, address, encryptedKey]
    );

    console.log(`Generated Polygon wallet for user ${userId}: ${address}`);

    return { address, createdAt: new Date() };
  }

  /**
   * Get a user's wallet address (generate if doesn't exist).
   */
  async getOrCreateWallet(userId: string): Promise<CryptoWalletInfo> {
    const existing = await db.queryOne<{ address: string; created_at: Date }>(
      `SELECT address, created_at FROM crypto_wallets WHERE user_id = $1`,
      [userId]
    );

    if (existing) {
      return { address: existing.address, createdAt: existing.created_at };
    }

    return await this.generateWallet(userId);
  }

  /**
   * Get the decrypted private key for a user's wallet (internal use only).
   */
  private async getPrivateKey(userId: string): Promise<string> {
    const row = await db.queryOne<{ encrypted_private_key: string }>(
      `SELECT encrypted_private_key FROM crypto_wallets WHERE user_id = $1`,
      [userId]
    );

    if (!row) {
      throw new Error('Crypto wallet not found for user');
    }

    return decrypt(row.encrypted_private_key);
  }

  // ─── Balance Queries ─────────────────────────────────────────────────────

  /**
   * Get all crypto balances for a user's wallet.
   */
  async getBalances(userId: string): Promise<CryptoBalance[]> {
    const walletInfo = await this.getOrCreateWallet(userId);
    const { Contract, formatUnits } = await this.getEthers();
    const provider = await this.getProvider();

    const balances: CryptoBalance[] = [];

    try {
      // MATIC balance (native)
      const maticBalance = await provider.getBalance(walletInfo.address);
      balances.push({
        asset: 'MATIC',
        symbol: 'MATIC',
        balance: maticBalance.toString(),
        balanceFormatted: parseFloat(formatUnits(maticBalance, 18)),
      });

      // USDT balance
      const usdtContract = new Contract(POLYGON_USDT_ADDRESS, ERC20_ABI, provider);
      const usdtBalance = await usdtContract.balanceOf(walletInfo.address);
      const usdtDecimals = await usdtContract.decimals();
      balances.push({
        asset: 'USDT',
        symbol: 'USDT',
        balance: usdtBalance.toString(),
        balanceFormatted: parseFloat(formatUnits(usdtBalance, usdtDecimals)),
        contractAddress: POLYGON_USDT_ADDRESS,
      });

      // USDC balance
      const usdcContract = new Contract(POLYGON_USDC_ADDRESS, ERC20_ABI, provider);
      const usdcBalance = await usdcContract.balanceOf(walletInfo.address);
      const usdcDecimals = await usdcContract.decimals();
      balances.push({
        asset: 'USDC',
        symbol: 'USDC',
        balance: usdcBalance.toString(),
        balanceFormatted: parseFloat(formatUnits(usdcBalance, usdcDecimals)),
        contractAddress: POLYGON_USDC_ADDRESS,
      });
    } catch (error) {
      console.error('Error fetching crypto balances:', error);
    }

    return balances;
  }

  // ─── Internal Transfers (no gas, DB-level) ───────────────────────────────

  /**
   * Transfer crypto between two SB0 Pay users (internal, no gas fees).
   * Just updates wallet_balances in DB.
   */
  async internalTransfer(
    fromUserId: string,
    toUserId: string,
    asset: string,
    amount: number,
    description?: string
  ): Promise<{ success: boolean; message: string }> {
    // Map asset to asset_code in wallet_balances
    const assetCode = this.mapAssetToCode(asset);

    // Import wallet service for the DB-level transfer
    const { walletService } = await import('./wallet.js');

    // This uses the existing wallet_balances system
    const fromWallet = await walletService.getOrCreateWallet(fromUserId);
    const toWallet = await walletService.getOrCreateWallet(toUserId);

    return await db.transaction(async (client) => {
      // Check sender balance
      const fromBal = await client.query(
        `SELECT balance FROM wallet_balances WHERE wallet_id = $1 AND asset_code = $2 FOR UPDATE`,
        [fromWallet.id, assetCode]
      );

      if (fromBal.rows.length === 0 || parseFloat(fromBal.rows[0].balance) < amount) {
        throw new Error(`Insufficient ${asset} balance`);
      }

      const senderBalance = parseFloat(fromBal.rows[0].balance) - amount;

      // Get or create recipient balance
      let toBal = await client.query(
        `SELECT balance FROM wallet_balances WHERE wallet_id = $1 AND asset_code = $2 FOR UPDATE`,
        [toWallet.id, assetCode]
      );

      let recipientBalance: number;
      if (toBal.rows.length === 0) {
        await client.query(
          `INSERT INTO wallet_balances (wallet_id, asset_code) VALUES ($1, $2)`,
          [toWallet.id, assetCode]
        );
        recipientBalance = amount;
      } else {
        recipientBalance = parseFloat(toBal.rows[0].balance) + amount;
      }

      // Update balances
      await client.query(
        `UPDATE wallet_balances SET balance = $1, updated_at = NOW() WHERE wallet_id = $2 AND asset_code = $3`,
        [senderBalance, fromWallet.id, assetCode]
      );
      await client.query(
        `UPDATE wallet_balances SET balance = $1, updated_at = NOW() WHERE wallet_id = $2 AND asset_code = $3`,
        [recipientBalance, toWallet.id, assetCode]
      );

      // Record transactions
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, asset_code, description)
         VALUES ($1, 'transfer_out', $2, $3, $4, $5)`,
        [fromWallet.id, amount, senderBalance, assetCode, description || `Sent ${amount} ${asset}`]
      );
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, asset_code, description)
         VALUES ($1, 'transfer_in', $2, $3, $4, $5)`,
        [toWallet.id, amount, recipientBalance, assetCode, `Received ${amount} ${asset}`]
      );

      return { success: true, message: `Transferred ${amount} ${asset} internally` };
    });
  }

  // ─── External Send (on-chain, costs gas) ─────────────────────────────────

  /**
   * Send crypto from a user's wallet to an external address (on-chain).
   */
  async externalSend(
    userId: string,
    toAddress: string,
    asset: string,
    amount: number
  ): Promise<TransferResult> {
    const { Wallet: EthWallet, Contract, parseUnits, formatUnits } = await this.getEthers();
    const provider = await this.getProvider();

    const privateKey = await this.getPrivateKey(userId);
    const signer = new EthWallet(privateKey, provider);

    let txHash: string;

    if (asset === 'MATIC') {
      // Native MATIC transfer
      const tx = await signer.sendTransaction({
        to: toAddress,
        value: parseUnits(amount.toString(), 18),
      });
      txHash = tx.hash;
      await tx.wait();
    } else {
      // ERC-20 token transfer
      const contractAddress = this.getContractAddress(asset);
      if (!contractAddress) throw new Error(`Unsupported asset: ${asset}`);

      const contract = new Contract(contractAddress, ERC20_ABI, signer);
      const decimals = await contract.decimals();
      const tx = await contract.transfer(toAddress, parseUnits(amount.toString(), decimals));
      txHash = tx.hash;
      await tx.wait();
    }

    return {
      txHash,
      from: signer.address,
      to: toAddress,
      amount: amount.toString(),
      asset,
      status: 'confirmed',
    };
  }

  // ─── Broker Wallet (Fiat ↔ Crypto Swap) ──────────────────────────────────

  /**
   * Buy crypto for a user using the broker wallet.
   * Broker sends crypto to user's wallet_balances (internal credit).
   * Called when user converts fiat balance to crypto.
   */
  async buyFromBroker(
    userId: string,
    asset: string,
    cryptoAmount: number,
    fiatAmount: number,
    fiatCurrency: string
  ): Promise<{ success: boolean; credited: number; asset: string }> {
    const assetCode = this.mapAssetToCode(asset);
    const { walletService } = await import('./wallet.js');

    // Debit fiat from user's FIAT_CARD balance
    const wallet = await walletService.getOrCreateWallet(userId);

    await db.transaction(async (client) => {
      // Debit fiat
      const fiatBal = await client.query(
        `SELECT balance FROM wallet_balances WHERE wallet_id = $1 AND asset_code = 'FIAT_CARD' FOR UPDATE`,
        [wallet.id]
      );

      if (fiatBal.rows.length === 0 || parseFloat(fiatBal.rows[0].balance) < fiatAmount) {
        throw new Error(`Insufficient fiat balance for swap. Need $${fiatAmount}`);
      }

      const newFiatBalance = parseFloat(fiatBal.rows[0].balance) - fiatAmount;
      await client.query(
        `UPDATE wallet_balances SET balance = $1, updated_at = NOW() WHERE wallet_id = $2 AND asset_code = 'FIAT_CARD'`,
        [newFiatBalance, wallet.id]
      );

      // Credit crypto
      let cryptoBal = await client.query(
        `SELECT balance FROM wallet_balances WHERE wallet_id = $1 AND asset_code = $2 FOR UPDATE`,
        [wallet.id, assetCode]
      );

      let newCryptoBalance: number;
      if (cryptoBal.rows.length === 0) {
        await client.query(
          `INSERT INTO wallet_balances (wallet_id, asset_code, balance) VALUES ($1, $2, $3)`,
          [wallet.id, assetCode, cryptoAmount]
        );
        newCryptoBalance = cryptoAmount;
      } else {
        newCryptoBalance = parseFloat(cryptoBal.rows[0].balance) + cryptoAmount;
        await client.query(
          `UPDATE wallet_balances SET balance = $1, updated_at = NOW() WHERE wallet_id = $2 AND asset_code = $3`,
          [newCryptoBalance, wallet.id, assetCode]
        );
      }

      // Record swap transactions
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, asset_code, description)
         VALUES ($1, 'swap_out', $2, $3, 'FIAT_CARD', $4)`,
        [wallet.id, fiatAmount, newFiatBalance, `Bought ${cryptoAmount} ${asset} for $${fiatAmount}`]
      );
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, asset_code, description)
         VALUES ($1, 'swap_in', $2, $3, $4, $5)`,
        [wallet.id, cryptoAmount, newCryptoBalance, assetCode, `Bought with $${fiatAmount} fiat`]
      );
    });

    return { success: true, credited: cryptoAmount, asset };
  }

  /**
   * Sell crypto back to fiat via broker wallet.
   */
  async sellToBroker(
    userId: string,
    asset: string,
    cryptoAmount: number,
    fiatAmount: number
  ): Promise<{ success: boolean; credited: number; currency: string }> {
    const assetCode = this.mapAssetToCode(asset);
    const { walletService } = await import('./wallet.js');
    const wallet = await walletService.getOrCreateWallet(userId);

    await db.transaction(async (client) => {
      // Debit crypto
      const cryptoBal = await client.query(
        `SELECT balance FROM wallet_balances WHERE wallet_id = $1 AND asset_code = $2 FOR UPDATE`,
        [wallet.id, assetCode]
      );

      if (cryptoBal.rows.length === 0 || parseFloat(cryptoBal.rows[0].balance) < cryptoAmount) {
        throw new Error(`Insufficient ${asset} balance`);
      }

      const newCryptoBalance = parseFloat(cryptoBal.rows[0].balance) - cryptoAmount;
      await client.query(
        `UPDATE wallet_balances SET balance = $1, updated_at = NOW() WHERE wallet_id = $2 AND asset_code = $3`,
        [newCryptoBalance, wallet.id, assetCode]
      );

      // Credit fiat
      let fiatBal = await client.query(
        `SELECT balance FROM wallet_balances WHERE wallet_id = $1 AND asset_code = 'FIAT_CARD' FOR UPDATE`,
        [wallet.id]
      );

      let newFiatBalance: number;
      if (fiatBal.rows.length === 0) {
        await client.query(
          `INSERT INTO wallet_balances (wallet_id, asset_code, balance) VALUES ($1, 'FIAT_CARD', $2)`,
          [wallet.id, fiatAmount]
        );
        newFiatBalance = fiatAmount;
      } else {
        newFiatBalance = parseFloat(fiatBal.rows[0].balance) + fiatAmount;
        await client.query(
          `UPDATE wallet_balances SET balance = $1, updated_at = NOW() WHERE wallet_id = $2 AND asset_code = 'FIAT_CARD'`,
          [newFiatBalance, wallet.id]
        );
      }

      // Record swap transactions
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, asset_code, description)
         VALUES ($1, 'swap_out', $2, $3, $4, $5)`,
        [wallet.id, cryptoAmount, newCryptoBalance, assetCode, `Sold ${cryptoAmount} ${asset} for $${fiatAmount}`]
      );
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, asset_code, description)
         VALUES ($1, 'swap_in', $2, $3, 'FIAT_CARD', $4)`,
        [wallet.id, fiatAmount, newFiatBalance, `Sold ${cryptoAmount} ${asset}`]
      );
    });

    return { success: true, credited: fiatAmount, currency: 'USD' };
  }

  // ─── Deposit Detection ───────────────────────────────────────────────────

  /**
   * Check for new deposits to a user's wallet address.
   * Called periodically or via Alchemy webhook.
   */
  async checkDeposits(userId: string): Promise<CryptoBalance[]> {
    // Get on-chain balances
    const onChainBalances = await this.getBalances(userId);
    
    // Compare with DB balances and credit any differences
    // This is a simplified version — production would use event logs
    return onChainBalances;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private mapAssetToCode(asset: string): string {
    const map: Record<string, string> = {
      'MATIC': 'MATIC_POLYGON',
      'USDT': 'USDT_POLYGON',
      'USDC': 'USDC_POLYGON',
      'BTC': 'BTC_MAINNET',
    };
    return map[asset.toUpperCase()] || `${asset.toUpperCase()}_POLYGON`;
  }

  private getContractAddress(asset: string): string | null {
    const map: Record<string, string> = {
      'USDT': POLYGON_USDT_ADDRESS,
      'USDC': POLYGON_USDC_ADDRESS,
    };
    return map[asset.toUpperCase()] || null;
  }
}

export const cryptoWalletService = new CryptoWalletService();
