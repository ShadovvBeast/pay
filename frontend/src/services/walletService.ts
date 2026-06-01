import { handleApiError } from '../utils/errorHandler';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2894';

export interface WalletBalance {
  balance: number;
  currency: string;
  walletId: string;
}

export interface AssetBalance {
  assetCode: string;
  name: string;
  symbol: string;
  assetType: 'fiat' | 'crypto';
  network: string;
  balance: number;
  valueUsd: number;
  isSwappable: boolean;
  depositAddress?: string;
}

export interface WalletAssetsResponse {
  totalValueUsd: number;
  balances: AssetBalance[];
  supportedAssets: Array<{
    code: string;
    name: string;
    symbol: string;
    assetType: string;
    network: string;
    decimals: number;
    isSwappable: boolean;
  }>;
}

export interface SwapResponse {
  message: string;
  rate: number;
  from: { asset: string; amount: number };
  to: { asset: string; amount: number };
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'deposit' | 'withdrawal' | 'refund_debit' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'swap_in' | 'swap_out';
  amount: number;
  balanceAfter: number;
  assetCode?: string;
  network?: string;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  createdAt: string;
}

export interface WalletLookupResult {
  walletId: string;
  shopName: string;
  ownerName: string;
  currency: string;
}

export interface TransferResponse {
  message: string;
  transaction: WalletTransaction;
}

export interface WalletTransactionsResponse {
  transactions: WalletTransaction[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface WithdrawResponse {
  message: string;
  transaction: WalletTransaction;
}

class WalletService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getBalance(): Promise<WalletBalance> {
    const response = await fetch(`${API_BASE_URL}/wallet/balance`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      await handleApiError(response, 'Failed to get wallet balance');
    }

    return await response.json();
  }

  async getTransactions(limit = 50, offset = 0): Promise<WalletTransactionsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(`${API_BASE_URL}/wallet/transactions?${params}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      await handleApiError(response, 'Failed to get wallet transactions');
    }

    return await response.json();
  }

  async withdraw(amount: number, description?: string): Promise<WithdrawResponse> {
    const response = await fetch(`${API_BASE_URL}/wallet/withdraw`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ amount, description }),
    });

    if (!response.ok) {
      await handleApiError(response, 'Withdrawal failed');
    }

    return await response.json();
  }

  async lookupWallet(walletId: string): Promise<WalletLookupResult> {
    const response = await fetch(`${API_BASE_URL}/wallet/lookup/${walletId.toUpperCase().trim()}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      await handleApiError(response, 'Wallet not found');
    }

    return await response.json();
  }

  async transfer(toWalletId: string, amount: number, description?: string): Promise<TransferResponse> {
    const response = await fetch(`${API_BASE_URL}/wallet/transfer`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ toWalletId: toWalletId.toUpperCase().trim(), amount, description }),
    });

    if (!response.ok) {
      await handleApiError(response, 'Transfer failed');
    }

    return await response.json();
  }

  async getAssets(): Promise<WalletAssetsResponse> {
    const response = await fetch(`${API_BASE_URL}/wallet/assets`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      await handleApiError(response, 'Failed to get asset balances');
    }

    return await response.json();
  }

  async swapAssets(fromAsset: string, toAsset: string, amount: number): Promise<SwapResponse> {
    const response = await fetch(`${API_BASE_URL}/wallet/swap`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ fromAsset, toAsset, amount }),
    });

    if (!response.ok) {
      await handleApiError(response, 'Swap failed');
    }

    return await response.json();
  }

  async getSupportedAssets(): Promise<{ assets: any[]; prices: any[] }> {
    const response = await fetch(`${API_BASE_URL}/wallet/supported-assets`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      await handleApiError(response, 'Failed to get supported assets');
    }

    return await response.json();
  }

  // ─── Crypto Methods ──────────────────────────────────────────────────

  async getDepositAddress(network: 'polygon' | 'plasma' = 'polygon'): Promise<{ address: string; network: string; networkName: string; supportedAssets: string; note: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/wallet/deposit`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ network }),
    });

    if (!response.ok) {
      await handleApiError(response, 'Failed to get deposit address');
    }

    return await response.json();
  }

  async getCryptoBalances(): Promise<{ balances: Array<{ asset: string; symbol: string; balance: string; balanceFormatted: number }>; network: string }> {
    const response = await fetch(`${API_BASE_URL}/wallet/crypto-balances`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      await handleApiError(response, 'Failed to get crypto balances');
    }

    return await response.json();
  }

  async buyCrypto(asset: string, fiatAmount: number): Promise<{ success: boolean; credited: number; asset: string; rate: number; fiatSpent: number }> {
    const response = await fetch(`${API_BASE_URL}/wallet/buy-crypto`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ asset, fiatAmount }),
    });

    if (!response.ok) {
      await handleApiError(response, 'Failed to buy crypto');
    }

    return await response.json();
  }

  async sellCrypto(asset: string, cryptoAmount: number): Promise<{ success: boolean; credited: number; currency: string; rate: number; cryptoSold: number }> {
    const response = await fetch(`${API_BASE_URL}/wallet/sell-crypto`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ asset, cryptoAmount }),
    });

    if (!response.ok) {
      await handleApiError(response, 'Failed to sell crypto');
    }

    return await response.json();
  }

  async sendCrypto(asset: string, toAddress: string, amount: number, network: 'polygon' | 'plasma' = 'polygon'): Promise<{ txHash: string; from: string; to: string; amount: string; asset: string; status: string; network: string }> {
    const response = await fetch(`${API_BASE_URL}/wallet/send-crypto`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ asset, toAddress, amount, network }),
    });

    if (!response.ok) {
      await handleApiError(response, 'Failed to send crypto');
    }

    return await response.json();
  }
}

export const walletService = new WalletService();
