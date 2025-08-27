import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { paymentService } from '../payment';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('PaymentService', () => {
  const API_BASE_URL = 'http://localhost:2894';

  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  describe('createPayment', () => {
    it('should create payment successfully', async () => {
      const mockResponse = {
        transaction: {
          id: 'txn-123',
          amount: 100.50,
          currency: 'ILS',
          status: 'pending',
          createdAt: new Date(),
        },
        paymentUrl: 'https://pay.allpay.co.il/payment/12345',
        qrCodeDataUrl: 'data:image/png;base64,mockqrcode',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await paymentService.createPayment({
        amount: 100.50,
        description: 'Test payment',
      });

      expect(mockFetch).toHaveBeenCalledWith(`${API_BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: 100.50,
          description: 'Test payment',
        }),
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle payment creation errors', async () => {
      const mockError = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Amount must be greater than 0',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockError),
      });

      await expect(
        paymentService.createPayment({
          amount: -10,
          description: 'Invalid payment',
        })
      ).rejects.toThrow('Amount must be greater than 0');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        paymentService.createPayment({
          amount: 50.00,
          description: 'Network test',
        })
      ).rejects.toThrow('Network error');
    });

    it('should include optional fields', async () => {
      const mockResponse = {
        transaction: {
          id: 'txn-456',
          amount: 75.25,
          currency: 'ILS',
          status: 'pending',
          createdAt: new Date(),
        },
        paymentUrl: 'https://pay.allpay.co.il/payment/67890',
        qrCodeDataUrl: 'data:image/png;base64,mockqrcode',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await paymentService.createPayment({
        amount: 75.25,
        description: 'Test payment with email',
        customerEmail: 'customer@example.com',
      });

      expect(mockFetch).toHaveBeenCalledWith(`${API_BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: 75.25,
          description: 'Test payment with email',
          customerEmail: 'customer@example.com',
        }),
      });
    });
  });

  describe('getPaymentStatus', () => {
    it('should get payment status successfully', async () => {
      const mockResponse = {
        transaction: {
          id: 'txn-123',
          amount: 100.50,
          currency: 'ILS',
          status: 'completed',
          paymentUrl: 'https://pay.allpay.co.il/payment/12345',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await paymentService.getPaymentStatus('txn-123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/payments/txn-123/status`,
        {
          credentials: 'include',
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle transaction not found', async () => {
      const mockError = {
        error: {
          code: 'TRANSACTION_NOT_FOUND',
          message: 'Transaction not found',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockError),
      });

      await expect(
        paymentService.getPaymentStatus('invalid-txn')
      ).rejects.toThrow('Transaction not found');
    });

    it('should handle unauthorized access', async () => {
      const mockError = {
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this transaction',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockError),
      });

      await expect(
        paymentService.getPaymentStatus('unauthorized-txn')
      ).rejects.toThrow('Access denied to this transaction');
    });
  });

  describe('getTransactionHistory', () => {
    it('should get transaction history successfully', async () => {
      const mockResponse = {
        transactions: [
          {
            id: 'txn-1',
            amount: 100.00,
            currency: 'ILS',
            status: 'completed',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'txn-2',
            amount: 50.00,
            currency: 'ILS',
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: {
          limit: 50,
          offset: 0,
          total: 2,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await paymentService.getTransactionHistory();

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/payments/history?limit=50&offset=0`,
        {
          credentials: 'include',
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle custom pagination parameters', async () => {
      const mockResponse = {
        transactions: [],
        pagination: {
          limit: 10,
          offset: 20,
          total: 0,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await paymentService.getTransactionHistory(10, 20);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/payments/history?limit=10&offset=20`,
        {
          credentials: 'include',
        }
      );
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment successfully', async () => {
      const mockResponse = {
        transaction: {
          id: 'txn-123',
          amount: 100.50,
          currency: 'ILS',
          status: 'cancelled',
          paymentUrl: 'https://pay.allpay.co.il/payment/12345',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await paymentService.cancelPayment('txn-123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/payments/txn-123/cancel`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle invalid status for cancellation', async () => {
      const mockError = {
        error: {
          code: 'INVALID_STATUS',
          message: 'Can only cancel pending payments',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockError),
      });

      await expect(
        paymentService.cancelPayment('completed-txn')
      ).rejects.toThrow('Can only cancel pending payments');
    });
  });

  describe('error handling', () => {
    it('should handle responses without error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      await expect(
        paymentService.createPayment({
          amount: 100,
          description: 'Test',
        })
      ).rejects.toThrow('Payment creation failed');
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(
        paymentService.createPayment({
          amount: 100,
          description: 'Test',
        })
      ).rejects.toThrow('Invalid JSON');
    });

    it('should use default error messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: {
            code: 'UNKNOWN_ERROR',
          },
        }),
      });

      await expect(
        paymentService.getPaymentStatus('txn-123')
      ).rejects.toThrow('Failed to get payment status');
    });
  });
});