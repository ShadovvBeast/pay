import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentFlow } from '../components/PaymentFlow';
import { paymentService } from '../services/payment';
import { useAuth } from '../hooks/useAuth';

// Mock the auth hook
vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'user-123',
      shopName: 'Test Shop',
      ownerName: 'Test Owner',
      email: 'test@example.com',
      merchantConfig: {
        currency: 'ILS',
        companyNumber: '123456789',
        language: 'en',
      },
    },
  })),
}));

// Mock the payment service
vi.mock('../services/payment', () => ({
  paymentService: {
    createPayment: vi.fn(),
    getPaymentStatus: vi.fn(),
    getTransactionHistory: vi.fn(),
    cancelPayment: vi.fn(),
  },
}));

// Mock QRCode library
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(() => Promise.resolve('data:image/png;base64,mockqrcode')),
  },
}));

describe('PaymentFlow Integration Tests', () => {
  const mockOnPaymentComplete = vi.fn();
  const mockOnPaymentError = vi.fn();

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Use fake timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Clean up any timers
    vi.useRealTimers();
  });

  it('should complete full payment flow successfully', async () => {
    // Mock successful payment creation
    (paymentService.createPayment as any).mockResolvedValueOnce({
      transaction: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        amount: 100.50,
        currency: 'ILS',
        status: 'pending',
        createdAt: new Date(),
      },
      paymentUrl: 'https://pay.allpay.co.il/payment/12345',
      qrCodeDataUrl: 'data:image/png;base64,mockqrcode',
    });

    // Mock payment status polling - first pending, then completed
    (paymentService.getPaymentStatus as any)
      .mockResolvedValueOnce({
        transaction: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          amount: 100.50,
          currency: 'ILS',
          status: 'pending',
          paymentUrl: 'https://pay.allpay.co.il/payment/12345',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .mockResolvedValueOnce({
        transaction: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          amount: 100.50,
          currency: 'ILS',
          status: 'completed',
          paymentUrl: 'https://pay.allpay.co.il/payment/12345',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

    render(
      <PaymentFlow
        onPaymentComplete={mockOnPaymentComplete}
        onPaymentError={mockOnPaymentError}
      />
    );

    // Step 1: Enter amount
    const amountInput = screen.getByRole('textbox');
    fireEvent.change(amountInput, { target: { value: '100.50' } });
    
    const createButton = screen.getByText('Create Payment');
    fireEvent.click(createButton);

    // Wait for payment creation
    await waitFor(() => {
      expect(paymentService.createPayment).toHaveBeenCalledWith({
        amount: 100.50,
        description: 'Payment from Test Shop',
      });
    });

    // Step 2: QR code should be displayed
    await waitFor(() => {
      expect(screen.getByText('₪100.50')).toBeInTheDocument();
      expect(screen.getByAltText('Payment QR Code')).toBeInTheDocument();
    });

    // Step 3: Payment status polling should start
    await waitFor(() => {
      expect(paymentService.getPaymentStatus).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    });

    // Step 4: Payment completion should be detected
    await waitFor(() => {
      expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
      expect(mockOnPaymentComplete).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  it('should handle payment creation errors', async () => {
    // Mock payment creation failure
    (paymentService.createPayment as any).mockRejectedValueOnce(
      new Error('Payment provider is currently unavailable')
    );

    render(
      <PaymentFlow
        onPaymentComplete={mockOnPaymentComplete}
        onPaymentError={mockOnPaymentError}
      />
    );

    // Enter amount and submit
    const amountInput = screen.getByRole('textbox');
    fireEvent.change(amountInput, { target: { value: '50.00' } });
    
    const createButton = screen.getByText('Create Payment');
    fireEvent.click(createButton);

    // Wait for error handling
    await waitFor(() => {
      expect(mockOnPaymentError).toHaveBeenCalledWith(
        'Payment provider is currently unavailable'
      );
    });

    // Should stay on amount input screen
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should handle payment failure status', async () => {
    // Mock successful payment creation
    (paymentService.createPayment as any).mockResolvedValueOnce({
      transaction: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        amount: 75.25,
        currency: 'ILS',
        status: 'pending',
        createdAt: new Date(),
      },
      paymentUrl: 'https://pay.allpay.co.il/payment/67890',
      qrCodeDataUrl: 'data:image/png;base64,mockqrcode',
    });

    // Mock payment status - failed
    (paymentService.getPaymentStatus as any).mockResolvedValueOnce({
      transaction: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        amount: 75.25,
        currency: 'ILS',
        status: 'failed',
        paymentUrl: 'https://pay.allpay.co.il/payment/67890',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    render(
      <PaymentFlow
        onPaymentComplete={mockOnPaymentComplete}
        onPaymentError={mockOnPaymentError}
      />
    );

    // Create payment
    const amountInput = screen.getByRole('textbox');
    fireEvent.change(amountInput, { target: { value: '75.25' } });
    
    const createButton = screen.getByText('Create Payment');
    fireEvent.click(createButton);

    // Wait for QR code display
    await waitFor(() => {
      expect(screen.getByText('₪75.25')).toBeInTheDocument();
    });

    // Wait for payment failure detection
    await waitFor(() => {
      expect(screen.getByText('Payment Failed')).toBeInTheDocument();
      expect(mockOnPaymentError).toHaveBeenCalledWith(
        'Payment failed. Please try again.'
      );
    });
  });

  it('should handle new payment flow', async () => {
    // Mock successful payment creation
    (paymentService.createPayment as any).mockResolvedValueOnce({
      transaction: {
        id: '550e8400-e29b-41d4-a716-446655440002',
        amount: 25.00,
        currency: 'ILS',
        status: 'pending',
        createdAt: new Date(),
      },
      paymentUrl: 'https://pay.allpay.co.il/payment/11111',
      qrCodeDataUrl: 'data:image/png;base64,mockqrcode',
    });

    render(
      <PaymentFlow
        onPaymentComplete={mockOnPaymentComplete}
        onPaymentError={mockOnPaymentError}
      />
    );

    // Create payment
    const amountInput = screen.getByRole('textbox');
    fireEvent.change(amountInput, { target: { value: '25.00' } });
    
    const createButton = screen.getByText('Create Payment');
    fireEvent.click(createButton);

    // Wait for QR code display
    await waitFor(() => {
      expect(screen.getByText('₪25.00')).toBeInTheDocument();
    });

    // Click "New Payment" button
    const newPaymentButton = screen.getByText('New Payment');
    fireEvent.click(newPaymentButton);

    // Should return to amount input
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByText('Create Payment')).toBeInTheDocument();
    });

    // Amount input should be cleared
    const newAmountInput = screen.getByRole('textbox');
    expect(newAmountInput).toHaveValue('');
  });

  it('should show loading state during payment creation', async () => {
    // Mock slow payment creation
    let resolvePayment: (value: any) => void;
    const paymentPromise = new Promise((resolve) => {
      resolvePayment = resolve;
    });
    (paymentService.createPayment as any).mockReturnValueOnce(paymentPromise);

    render(
      <PaymentFlow
        onPaymentComplete={mockOnPaymentComplete}
        onPaymentError={mockOnPaymentError}
      />
    );

    // Create payment
    const amountInput = screen.getByRole('textbox');
    fireEvent.change(amountInput, { target: { value: '100.00' } });
    
    const createButton = screen.getByText('Create Payment');
    fireEvent.click(createButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Creating Payment')).toBeInTheDocument();
      expect(screen.getByText('Please wait while we generate your payment link...')).toBeInTheDocument();
      expect(screen.getByText('₪100.00')).toBeInTheDocument();
    });

    // Resolve the payment
    resolvePayment!({
      transaction: {
        id: 'txn-loading',
        amount: 100.00,
        currency: 'ILS',
        status: 'pending',
        createdAt: new Date(),
      },
      paymentUrl: 'https://pay.allpay.co.il/payment/loading',
      qrCodeDataUrl: 'data:image/png;base64,mockqrcode',
    });

    // Should show QR code
    await waitFor(() => {
      expect(screen.getByAltText('Payment QR Code')).toBeInTheDocument();
    });
  });

  it('should handle status polling timeout', async () => {
    // Mock successful payment creation
    (paymentService.createPayment as any).mockResolvedValueOnce({
      transaction: {
        id: 'txn-timeout',
        amount: 50.00,
        currency: 'ILS',
        status: 'pending',
        createdAt: new Date(),
      },
      paymentUrl: 'https://pay.allpay.co.il/payment/timeout',
      qrCodeDataUrl: 'data:image/png;base64,mockqrcode',
    });

    // Mock status polling that always returns pending
    (paymentService.getPaymentStatus as any).mockResolvedValue({
      transaction: {
        id: 'txn-timeout',
        amount: 50.00,
        currency: 'ILS',
        status: 'pending',
        paymentUrl: 'https://pay.allpay.co.il/payment/timeout',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    render(
      <PaymentFlow
        onPaymentComplete={mockOnPaymentComplete}
        onPaymentError={mockOnPaymentError}
      />
    );

    // Create payment
    const amountInput = screen.getByRole('textbox');
    fireEvent.change(amountInput, { target: { value: '50.00' } });
    
    const createButton = screen.getByText('Create Payment');
    fireEvent.click(createButton);

    // Wait for QR code display
    await waitFor(() => {
      expect(screen.getByText('₪50.00')).toBeInTheDocument();
    });

    // Fast-forward time to trigger timeout (60 attempts * 3 seconds = 180 seconds)
    vi.advanceTimersByTime(181000);

    // Should show timeout error
    await waitFor(() => {
      expect(mockOnPaymentError).toHaveBeenCalledWith(
        'Payment status polling timed out. Please check manually.'
      );
    });
  });
});