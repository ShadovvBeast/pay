import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { QRCodeDisplay } from '../QRCodeDisplay';

// Mock QRCode library
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mock-qr-code'),
  },
}));

// Mock window.open
Object.defineProperty(window, 'open', {
  writable: true,
  value: vi.fn(),
});

describe('QRCodeDisplay - Core Functionality', () => {
  const defaultProps = {
    paymentUrl: 'https://payment.example.com/pay/123',
    amount: 123.45,
    currency: 'ILS',
    onNewPayment: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders payment amount with currency', async () => {
      render(<QRCodeDisplay {...defaultProps} />);
      
      expect(screen.getByText('₪123.45')).toBeInTheDocument();
      expect(screen.getByText('Payment Amount')).toBeInTheDocument();
    });

    it('renders payment instructions', () => {
      render(<QRCodeDisplay {...defaultProps} />);
      
      expect(screen.getByText('How to pay:')).toBeInTheDocument();
      expect(screen.getByText(/Scan the QR code with your phone camera/)).toBeInTheDocument();
      expect(screen.getByText(/Credit Card, Bit, or Apple Pay/)).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      render(<QRCodeDisplay {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: 'New Payment' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open Payment Link' })).toBeInTheDocument();
    });
  });

  describe('QR Code Display', () => {
    it('displays QR code image when generated', async () => {
      render(<QRCodeDisplay {...defaultProps} />);
      
      await waitFor(() => {
        const qrImage = screen.getByAltText('Payment QR Code');
        expect(qrImage).toBeInTheDocument();
        expect(qrImage).toHaveAttribute('src', 'data:image/png;base64,mock-qr-code');
      });
    });

    it('shows scan instruction', async () => {
      render(<QRCodeDisplay {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Scan to pay with Credit Card, Bit, or Apple Pay/)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when isLoading is true', () => {
      render(<QRCodeDisplay {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText('Creating Payment')).toBeInTheDocument();
      expect(screen.getByText('Please wait while we generate your payment link...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message when error prop is provided', () => {
      const errorMessage = 'Payment creation failed';
      render(<QRCodeDisplay {...defaultProps} error={errorMessage} />);
      
      expect(screen.getByText('Payment Failed')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onNewPayment when New Payment button is clicked', async () => {
      const user = userEvent.setup();
      render(<QRCodeDisplay {...defaultProps} />);
      
      const newPaymentButton = screen.getByRole('button', { name: 'New Payment' });
      await user.click(newPaymentButton);
      
      expect(defaultProps.onNewPayment).toHaveBeenCalledTimes(1);
    });

    it('opens payment link when Open Payment Link is clicked', async () => {
      const user = userEvent.setup();
      render(<QRCodeDisplay {...defaultProps} />);
      
      const openLinkButton = screen.getByRole('button', { name: 'Open Payment Link' });
      await user.click(openLinkButton);
      
      expect(window.open).toHaveBeenCalledWith(defaultProps.paymentUrl, '_blank');
    });
  });

  describe('Currency Support', () => {
    it('displays USD currency correctly', () => {
      render(<QRCodeDisplay {...defaultProps} currency="USD" amount={50.00} />);
      
      expect(screen.getByText('$50.00')).toBeInTheDocument();
    });

    it('displays EUR currency correctly', () => {
      render(<QRCodeDisplay {...defaultProps} currency="EUR" amount={75.50} />);
      
      expect(screen.getByText('€75.50')).toBeInTheDocument();
    });

    it('formats large amounts with commas', () => {
      render(<QRCodeDisplay {...defaultProps} amount={1234.56} />);
      
      expect(screen.getByText('₪1,234.56')).toBeInTheDocument();
    });
  });
});