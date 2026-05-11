import { handleApiError } from '../utils/errorHandler';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2894';

export interface WalletBalance {
  balance: number;
  currency: string;
  walletId: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'deposit' | 'withdrawal' | 'refund_debit' | 'adjustment' | 'transfer_in' | 'transfer_out';
  amount: number;
  balanceAfter: number;
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
}

export const walletService = new WalletService();
