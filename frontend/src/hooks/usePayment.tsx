import { useState, useCallback, useRef, useEffect } from 'react';
import { paymentService, CreatePaymentRequest, CreatePaymentResponse, PaymentStatusResponse } from '../services/payment';

export interface PaymentState {
  isLoading: boolean;
  error: string | null;
  currentPayment: CreatePaymentResponse | null;
  paymentStatus: PaymentStatusResponse | null;
  isPolling: boolean;
}

export interface UsePaymentReturn {
  state: PaymentState;
  createPayment: (data: CreatePaymentRequest) => Promise<void>;
  getPaymentStatus: (transactionId: string) => Promise<void>;
  startStatusPolling: (transactionId: string, intervalMs?: number) => void;
  stopStatusPolling: () => void;
  clearPayment: () => void;
  clearError: () => void;
}

const DEFAULT_POLLING_INTERVAL = 3000; // 3 seconds
const MAX_POLLING_ATTEMPTS = 600; // Max polling

export const usePayment = (): UsePaymentReturn => {
  const [state, setState] = useState<PaymentState>({
    isLoading: false,
    error: null,
    currentPayment: null,
    paymentStatus: null,
    isPolling: false,
  });

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingAttemptsRef = useRef(0);

  // Clear polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const createPayment = useCallback(async (data: CreatePaymentRequest) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      currentPayment: null,
      paymentStatus: null,
    }));

    try {
      const response = await paymentService.createPayment(data);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        currentPayment: response,
        error: null,
      }));

      // Start polling for payment status
      startStatusPolling(response.transaction.id);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create payment';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        currentPayment: null,
      }));
    }
  }, []);

  const getPaymentStatus = useCallback(async (transactionId: string) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await paymentService.getPaymentStatus(transactionId);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        paymentStatus: response,
        error: null,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get payment status';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const startStatusPolling = useCallback((transactionId: string, intervalMs = DEFAULT_POLLING_INTERVAL) => {
    // Clear any existing polling
    stopStatusPolling();

    setState(prev => ({
      ...prev,
      isPolling: true,
    }));

    pollingAttemptsRef.current = 0;

    const pollStatus = async () => {
      try {
        pollingAttemptsRef.current += 1;

        const response = await paymentService.getPaymentStatus(transactionId);
        
        setState(prev => ({
          ...prev,
          paymentStatus: response,
          error: null,
        }));

        // Stop polling if payment is completed, failed, or cancelled
        if (['completed', 'failed', 'cancelled'].includes(response.transaction.status)) {
          stopStatusPolling();
          return;
        }

        // Stop polling if max attempts reached
        if (pollingAttemptsRef.current >= MAX_POLLING_ATTEMPTS) {
          stopStatusPolling();
          setState(prev => ({
            ...prev,
            error: 'Payment status polling timed out. Please check manually.',
          }));
          return;
        }

      } catch (error) {
        console.error('Payment status polling error:', error);
        
        // Continue polling on error, but increment attempts
        if (pollingAttemptsRef.current >= MAX_POLLING_ATTEMPTS) {
          stopStatusPolling();
          setState(prev => ({
            ...prev,
            error: 'Failed to check payment status. Please refresh to check manually.',
          }));
        }
      }
    };

    // Initial poll
    pollStatus();

    // Set up interval polling
    pollingIntervalRef.current = setInterval(pollStatus, intervalMs);
  }, []);

  const stopStatusPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isPolling: false,
    }));

    pollingAttemptsRef.current = 0;
  }, []);

  const clearPayment = useCallback(() => {
    stopStatusPolling();
    
    setState({
      isLoading: false,
      error: null,
      currentPayment: null,
      paymentStatus: null,
      isPolling: false,
    });
  }, [stopStatusPolling]);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  return {
    state,
    createPayment,
    getPaymentStatus,
    startStatusPolling,
    stopStatusPolling,
    clearPayment,
    clearError,
  };
};