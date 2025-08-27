import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePayment } from '../usePayment';
import { paymentService } from '../../services/payment';

// Mock the payment service
vi.mock('../../services/payment', () => ({
  paymentService: {
    createPayment: vi.fn(),
    getPaymentStatus: vi.fn(),
    getTransactionHistory: vi.fn(),
    cancelPayment: vi.fn(),
  },
}));

describe('usePayment Hook', () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Use fake timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Restore real timers
    vi.useRealTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => usePayment());

    expect(result.current.state).toEqual({
      isLoading: false,
      error: null,
      currentPayment: null,
      paymentStatus: null,
      isPolling: false,
    });
  });

  describe('createPayment', () => {
    it('should create payment successfully', async () => {
      const mockPaymentResponse = {
        transaction: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          amount: 100.50,
          currency: 'ILS',
          status: 'pending',
          createdAt: new Date(),
        },
        paymentUrl: 'https://pay.allpay.co.il/payment/12345',
        qrCodeDataUrl: 'data:image/png;base64,mockqrcode',
      };

      (paymentService.createPayment as any).mockResolvedValueOnce(mockPaymentResponse);
      (paymentService.getPaymentStatus as any).mockResolvedValueOnce({
        transaction: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          amount: 100.50,
          currency: 'ILS',
          status: 'pending',
          paymentUrl: 'https://pay.allpay.co.il/payment/12345',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const { result } = renderHook(() => usePayment());

      // Start payment creation
      act(() => {
        result.current.createPayment({
          amount: 100.50,
          description: 'Test payment',
        });
      });

      // Should be loading
      expect(result.current.state.isLoading).toBe(true);
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.currentPayment).toBe(null);

      // Wait for payment creation to complete
      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      expect(result.current.state.currentPayment).toEqual(mockPaymentResponse);
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.isPolling).toBe(true);

      expect(paymentService.createPayment).toHaveBeenCalledWith({
        amount: 100.50,
        description: 'Test payment',
      });
    });

    it('should handle payment creation errors', async () => {
      const errorMessage = 'Payment provider is unavailable';
      (paymentService.createPayment as any).mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => usePayment());

      act(() => {
        result.current.createPayment({
          amount: 100.50,
          description: 'Test payment',
        });
      });

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      expect(result.current.state.error).toBe(errorMessage);
      expect(result.current.state.currentPayment).toBe(null);
      expect(result.current.state.isPolling).toBe(false);
    });
  });

  describe('getPaymentStatus', () => {
    it('should get payment status successfully', async () => {
      const mockStatusResponse = {
        transaction: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          amount: 100.50,
          currency: 'ILS',
          status: 'completed',
          paymentUrl: 'https://pay.allpay.co.il/payment/12345',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      (paymentService.getPaymentStatus as any).mockResolvedValueOnce(mockStatusResponse);

      const { result } = renderHook(() => usePayment());

      act(() => {
        result.current.getPaymentStatus('550e8400-e29b-41d4-a716-446655440001');
      });

      expect(result.current.state.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      expect(result.current.state.paymentStatus).toEqual(mockStatusResponse);
      expect(result.current.state.error).toBe(null);

      expect(paymentService.getPaymentStatus).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should handle payment status errors', async () => {
      const errorMessage = 'Transaction not found';
      (paymentService.getPaymentStatus as any).mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => usePayment());

      act(() => {
        result.current.getPaymentStatus('550e8400-e29b-41d4-a716-446655440002');
      });

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      expect(result.current.state.error).toBe(errorMessage);
      expect(result.current.state.paymentStatus).toBe(null);
    });
  });

  describe('status polling', () => {
    it('should start and stop polling correctly', async () => {
      const mockStatusResponse = {
        transaction: {
          id: '550e8400-e29b-41d4-a716-446655440003',
          amount: 100.50,
          currency: 'ILS',
          status: 'pending',
          paymentUrl: 'https://pay.allpay.co.il/payment/12345',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      (paymentService.getPaymentStatus as any).mockResolvedValue(mockStatusResponse);

      const { result } = renderHook(() => usePayment());

      // Start polling
      act(() => {
        result.current.startStatusPolling('550e8400-e29b-41d4-a716-446655440003');
      });

      expect(result.current.state.isPolling).toBe(true);

      // Wait for initial poll
      await waitFor(() => {
        expect(paymentService.getPaymentStatus).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440003');
      });

      // Advance time to trigger another poll
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(paymentService.getPaymentStatus).toHaveBeenCalledTimes(2);
      });

      // Stop polling
      act(() => {
        result.current.stopStatusPolling();
      });

      expect(result.current.state.isPolling).toBe(false);
    });

    it('should stop polling when payment is completed', async () => {
      const pendingResponse = {
        transaction: {
          id: '550e8400-e29b-41d4-a716-446655440004',
          amount: 100.50,
          currency: 'ILS',
          status: 'pending',
          paymentUrl: 'https://pay.allpay.co.il/payment/12345',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const completedResponse = {
        transaction: {
          ...pendingResponse.transaction,
          status: 'completed',
        },
      };

      (paymentService.getPaymentStatus as any)
        .mockResolvedValueOnce(pendingResponse)
        .mockResolvedValueOnce(completedResponse);

      const { result } = renderHook(() => usePayment());

      act(() => {
        result.current.startStatusPolling('550e8400-e29b-41d4-a716-446655440004');
      });

      // Wait for initial poll
      await waitFor(() => {
        expect(result.current.state.paymentStatus).toEqual(pendingResponse);
      });

      // Advance time to trigger second poll
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Wait for completed status
      await waitFor(() => {
        expect(result.current.state.paymentStatus).toEqual(completedResponse);
      });

      // Should stop polling automatically
      expect(result.current.state.isPolling).toBe(false);
      expect(paymentService.getPaymentStatus).toHaveBeenCalledTimes(2);
    });

    it('should stop polling on failed status', async () => {
      const failedResponse = {
        transaction: {
          id: '550e8400-e29b-41d4-a716-446655440005',
          amount: 100.50,
          currency: 'ILS',
          status: 'failed',
          paymentUrl: 'https://pay.allpay.co.il/payment/12345',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      (paymentService.getPaymentStatus as any).mockResolvedValueOnce(failedResponse);

      const { result } = renderHook(() => usePayment());

      act(() => {
        result.current.startStatusPolling('550e8400-e29b-41d4-a716-446655440005');
      });

      await waitFor(() => {
        expect(result.current.state.paymentStatus).toEqual(failedResponse);
      });

      expect(result.current.state.isPolling).toBe(false);
    });

    it('should handle polling timeout', async () => {
      const pendingResponse = {
        transaction: {
          id: '550e8400-e29b-41d4-a716-446655440006',
          amount: 100.50,
          currency: 'ILS',
          status: 'pending',
          paymentUrl: 'https://pay.allpay.co.il/payment/12345',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      (paymentService.getPaymentStatus as any).mockResolvedValue(pendingResponse);

      const { result } = renderHook(() => usePayment());

      act(() => {
        result.current.startStatusPolling('550e8400-e29b-41d4-a716-446655440006');
      });

      // Simulate max polling attempts (60 * 3 seconds = 180 seconds)
      act(() => {
        vi.advanceTimersByTime(180000);
      });

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Payment status polling timed out. Please check manually.'
        );
      });

      expect(result.current.state.isPolling).toBe(false);
    });

    it('should handle polling errors', async () => {
      (paymentService.getPaymentStatus as any).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => usePayment());

      act(() => {
        result.current.startStatusPolling('550e8400-e29b-41d4-a716-446655440007');
      });

      // Simulate max polling attempts with errors (60 * 3 seconds = 180 seconds)
      act(() => {
        vi.advanceTimersByTime(180000);
      });

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Failed to check payment status. Please refresh to check manually.'
        );
      });

      expect(result.current.state.isPolling).toBe(false);
    });
  });

  describe('utility functions', () => {
    it('should clear payment state', () => {
      const { result } = renderHook(() => usePayment());

      // Set some state first
      act(() => {
        result.current.startStatusPolling('550e8400-e29b-41d4-a716-446655440008');
      });

      expect(result.current.state.isPolling).toBe(true);

      // Clear payment
      act(() => {
        result.current.clearPayment();
      });

      expect(result.current.state).toEqual({
        isLoading: false,
        error: null,
        currentPayment: null,
        paymentStatus: null,
        isPolling: false,
      });
    });

    it('should clear error', async () => {
      (paymentService.createPayment as any).mockRejectedValueOnce(
        new Error('Test error')
      );

      const { result } = renderHook(() => usePayment());

      // Create an error
      act(() => {
        result.current.createPayment({
          amount: 100,
          description: 'Test',
        });
      });

      await waitFor(() => {
        expect(result.current.state.error).toBe('Test error');
      });

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.state.error).toBe(null);
    });
  });

  describe('cleanup', () => {
    it('should cleanup polling on unmount', () => {
      const { result, unmount } = renderHook(() => usePayment());

      act(() => {
        result.current.startStatusPolling('550e8400-e29b-41d4-a716-446655440009');
      });

      expect(result.current.state.isPolling).toBe(true);

      // Unmount should cleanup
      unmount();

      // No assertions needed - just ensuring no errors occur
    });
  });
});