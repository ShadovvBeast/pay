import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TransactionHistory } from '../components/TransactionHistory';
import { paymentService } from '../services/payment';

// Mock the payment service
vi.mock('../services/payment', () => ({
  paymentService: {
    getTransactionHistory: vi.fn(),
  },
}));

describe('TransactionHistory', () => {

  it('should render loading state initially', () => {
    vi.clearAllMocks();
    // Mock pending promise
    (paymentService.getTransactionHistory as any).mockReturnValue(new Promise(() => {}));
    
    render(<TransactionHistory />);
    
    expect(screen.getByText('Transaction History')).toBeInTheDocument();
    // Should show loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should render empty state when no transactions', async () => {
    vi.clearAllMocks();
    (paymentService.getTransactionHistory as any).mockResolvedValue({
      transactions: [],
      pagination: { limit: 20, offset: 0, total: 0 }
    });
    
    render(<TransactionHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('No Transactions Yet')).toBeInTheDocument();
      expect(screen.getByText('Your payment transactions will appear here once you create your first payment.')).toBeInTheDocument();
    });
  });

  it('should render transactions list', async () => {
    vi.clearAllMocks();
    const mockTransactions = [
      {
        id: 'txn-123',
        amount: 100.50,
        currency: 'ILS',
        status: 'completed',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:35:00Z'
      },
      {
        id: 'txn-456',
        amount: 75.25,
        currency: 'USD',
        status: 'pending',
        createdAt: '2024-01-14T15:20:00Z',
        updatedAt: '2024-01-14T15:20:00Z'
      }
    ];

    (paymentService.getTransactionHistory as any).mockResolvedValue({
      transactions: mockTransactions,
      pagination: { limit: 20, offset: 0, total: 2 }
    });
    
    render(<TransactionHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('2 total transactions')).toBeInTheDocument();
      expect(screen.getByText('Payment #txn-123')).toBeInTheDocument();
      expect(screen.getByText('Payment #txn-456')).toBeInTheDocument();
      expect(screen.getByText('₪100.50')).toBeInTheDocument();
      expect(screen.getByText('$75.25')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  it('should handle error state', async () => {
    vi.clearAllMocks();
    (paymentService.getTransactionHistory as any).mockRejectedValue(
      new Error('Network error')
    );
    
    render(<TransactionHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to Load Transactions')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('should refresh transactions when refresh button is clicked', async () => {
    vi.clearAllMocks();
    const mockTransactions = [
      {
        id: 'txn-123',
        amount: 100.50,
        currency: 'ILS',
        status: 'completed',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:35:00Z'
      }
    ];

    (paymentService.getTransactionHistory as any).mockResolvedValue({
      transactions: mockTransactions,
      pagination: { limit: 20, offset: 0, total: 1 }
    });
    
    render(<TransactionHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('1 total transaction')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('↻ Refresh');
    fireEvent.click(refreshButton);

    expect(paymentService.getTransactionHistory).toHaveBeenCalledTimes(2);
  });

  it('should load more transactions when load more button is clicked', async () => {
    vi.clearAllMocks();
    const initialTransactions = [
      {
        id: 'txn-123',
        amount: 100.50,
        currency: 'ILS',
        status: 'completed',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:35:00Z'
      }
    ];

    const additionalTransactions = [
      {
        id: 'txn-456',
        amount: 75.25,
        currency: 'USD',
        status: 'pending',
        createdAt: '2024-01-14T15:20:00Z',
        updatedAt: '2024-01-14T15:20:00Z'
      }
    ];

    // First call returns initial transactions
    (paymentService.getTransactionHistory as any)
      .mockResolvedValueOnce({
        transactions: initialTransactions,
        pagination: { limit: 20, offset: 0, total: 2 }
      })
      .mockResolvedValueOnce({
        transactions: additionalTransactions,
        pagination: { limit: 20, offset: 20, total: 2 }
      });
    
    render(<TransactionHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('Payment #txn-123')).toBeInTheDocument();
      expect(screen.getByText('Load More (1 remaining)')).toBeInTheDocument();
    });

    const loadMoreButton = screen.getByText('Load More (1 remaining)');
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(screen.getByText('Payment #txn-456')).toBeInTheDocument();
    });

    expect(paymentService.getTransactionHistory).toHaveBeenCalledTimes(2);
    expect(paymentService.getTransactionHistory).toHaveBeenNthCalledWith(1, 20, 0);
    expect(paymentService.getTransactionHistory).toHaveBeenNthCalledWith(2, 20, 20);
  });

  it('should format different currencies correctly', async () => {
    vi.clearAllMocks();
    const mockTransactions = [
      {
        id: 'txn-ils',
        amount: 100.50,
        currency: 'ILS',
        status: 'completed',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:35:00Z'
      },
      {
        id: 'txn-usd',
        amount: 75.25,
        currency: 'USD',
        status: 'pending',
        createdAt: '2024-01-14T15:20:00Z',
        updatedAt: '2024-01-14T15:20:00Z'
      },
      {
        id: 'txn-eur',
        amount: 50.00,
        currency: 'EUR',
        status: 'failed',
        createdAt: '2024-01-13T12:15:00Z',
        updatedAt: '2024-01-13T12:20:00Z'
      },
      {
        id: 'txn-ugx',
        amount: 25000.00,
        currency: 'UGX',
        status: 'completed',
        createdAt: '2024-01-12T08:30:00Z',
        updatedAt: '2024-01-12T08:35:00Z'
      }
    ];

    (paymentService.getTransactionHistory as any).mockResolvedValue({
      transactions: mockTransactions,
      pagination: { limit: 20, offset: 0, total: 4 }
    });
    
    render(<TransactionHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('₪100.50')).toBeInTheDocument();
      expect(screen.getByText('$75.25')).toBeInTheDocument();
      expect(screen.getByText('€50.00')).toBeInTheDocument();
      expect(screen.getByText('USh25000.00')).toBeInTheDocument();
    });
  });

  it('should display correct status colors and icons', async () => {
    vi.clearAllMocks();
    const mockTransactions = [
      {
        id: 'txn-completed',
        amount: 100.50,
        currency: 'ILS',
        status: 'completed',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:35:00Z'
      },
      {
        id: 'txn-pending',
        amount: 75.25,
        currency: 'USD',
        status: 'pending',
        createdAt: '2024-01-14T15:20:00Z',
        updatedAt: '2024-01-14T15:20:00Z'
      },
      {
        id: 'txn-failed',
        amount: 50.00,
        currency: 'EUR',
        status: 'failed',
        createdAt: '2024-01-13T12:15:00Z',
        updatedAt: '2024-01-13T12:20:00Z'
      },
      {
        id: 'txn-cancelled',
        amount: 25.00,
        currency: 'GBP',
        status: 'cancelled',
        createdAt: '2024-01-12T09:10:00Z',
        updatedAt: '2024-01-12T09:15:00Z'
      }
    ];

    (paymentService.getTransactionHistory as any).mockResolvedValue({
      transactions: mockTransactions,
      pagination: { limit: 20, offset: 0, total: 4 }
    });
    
    render(<TransactionHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('✅')).toBeInTheDocument(); // completed
      expect(screen.getByText('⏳')).toBeInTheDocument(); // pending
      expect(screen.getByText('❌')).toBeInTheDocument(); // failed
      expect(screen.getByText('🚫')).toBeInTheDocument(); // cancelled
      
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });
  });
});