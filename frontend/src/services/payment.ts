import { PaymentData, PaymentResponse, Transaction } from '../types/payment';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2894';

export interface CreatePaymentRequest {
  amount: number;
  description?: string;
  customerEmail?: string;
}

export interface CreatePaymentResponse {
  transaction: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: Date;
  };
  paymentUrl: string;
  qrCodeDataUrl: string;
}

export interface PaymentStatusResponse {
  transaction: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    paymentUrl: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface TransactionHistoryResponse {
  transactions: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

class PaymentService {
  async createPayment(data: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    const response = await fetch(`${API_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for auth
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Payment creation failed');
    }

    return await response.json();
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    const response = await fetch(`${API_BASE_URL}/payments/${transactionId}/status`, {
      credentials: 'include', // Include cookies for auth
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to get payment status');
    }

    return await response.json();
  }

  async getTransactionHistory(limit = 50, offset = 0): Promise<TransactionHistoryResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(`${API_BASE_URL}/payments/history?${params}`, {
      credentials: 'include', // Include cookies for auth
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to get transaction history');
    }

    return await response.json();
  }

  async getTransactionDetails(transactionId: string): Promise<{
    transaction: {
      id: string;
      amount: number;
      currency: string;
      status: string;
      paymentUrl: string;
      createdAt: Date;
      updatedAt: Date;
    };
    allPayDetails: any;
  }> {
    const response = await fetch(`${API_BASE_URL}/payments/${transactionId}/details`, {
      credentials: 'include', // Include cookies for auth
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to get transaction details');
    }

    return await response.json();
  }

  async refundPayment(transactionId: string, amount?: number): Promise<PaymentStatusResponse> {
    const response = await fetch(`${API_BASE_URL}/payments/${transactionId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for auth
      body: JSON.stringify({ amount }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to process refund');
    }

    return await response.json();
  }

  async cancelPayment(transactionId: string): Promise<PaymentStatusResponse> {
    const response = await fetch(`${API_BASE_URL}/payments/${transactionId}/cancel`, {
      method: 'POST',
      credentials: 'include', // Include cookies for auth
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to cancel payment');
    }

    return await response.json();
  }
}

export const paymentService = new PaymentService();