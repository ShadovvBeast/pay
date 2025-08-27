import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { AmountInput } from '../AmountInput';

describe('AmountInput - Core Functionality', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    currency: 'ILS',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders with ILS currency', () => {
      render(<AmountInput {...defaultProps} />);
      
      expect(screen.getByText('₪')).toBeInTheDocument();
      expect(screen.getByText('Israeli Shekel')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create payment/i })).toBeInTheDocument();
    });

    it('renders with USD currency', () => {
      render(<AmountInput {...defaultProps} currency="USD" />);
      
      expect(screen.getByText('$')).toBeInTheDocument();
      expect(screen.getByText('US Dollar')).toBeInTheDocument();
    });

    it('shows loading state', () => {
      render(<AmountInput {...defaultProps} isLoading={true} />);
      
      const input = screen.getByRole('textbox');
      const button = screen.getByRole('button', { name: /creating payment/i });
      
      expect(input).toBeDisabled();
      expect(button).toBeDisabled();
    });

    it('displays error message', () => {
      const error = 'Payment failed';
      render(<AmountInput {...defaultProps} error={error} />);
      
      expect(screen.getByText(error)).toBeInTheDocument();
    });
  });

  describe('Input Handling', () => {
    it('accepts numeric input', async () => {
      const user = userEvent.setup();
      render(<AmountInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, '123');
      
      expect(defaultProps.onChange).toHaveBeenCalledWith('123');
    });

    it('accepts decimal input', async () => {
      const user = userEvent.setup();
      render(<AmountInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, '123.45');
      
      expect(defaultProps.onChange).toHaveBeenLastCalledWith('123.45');
    });

    it('limits decimal places to 2', async () => {
      const user = userEvent.setup();
      render(<AmountInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, '12.345');
      
      expect(input).toHaveValue('12.34');
    });
  });

  describe('Form Submission', () => {
    it('submits valid amount', async () => {
      const user = userEvent.setup();
      render(<AmountInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      const button = screen.getByRole('button', { name: /create payment/i });
      
      await user.type(input, '123.45');
      await user.click(button);
      
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(123.45);
    });

    it('submits on Enter key', async () => {
      const user = userEvent.setup();
      render(<AmountInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      
      await user.type(input, '50');
      await user.keyboard('{Enter}');
      
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(50);
    });

    it('does not submit empty amount', async () => {
      const user = userEvent.setup();
      render(<AmountInput {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /create payment/i });
      await user.click(button);
      
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Quick Amount Buttons', () => {
    it('sets amount when quick button is clicked', async () => {
      const user = userEvent.setup();
      render(<AmountInput {...defaultProps} />);
      
      const quickButton = screen.getByRole('button', { name: '₪50' });
      await user.click(quickButton);
      
      expect(defaultProps.onChange).toHaveBeenCalledWith('50');
    });

    it('renders all quick amount buttons', () => {
      render(<AmountInput {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: '₪10' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '₪50' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '₪100' })).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('shows error for zero amount after interaction', async () => {
      const user = userEvent.setup();
      render(<AmountInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, '0');
      
      // Try to submit to trigger validation
      const button = screen.getByRole('button', { name: /create payment/i });
      await user.click(button);
      
      expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument();
    });

    it('disables submit button for invalid input', async () => {
      const user = userEvent.setup();
      render(<AmountInput {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /create payment/i });
      
      // Initially disabled (empty)
      expect(button).toBeDisabled();
      
      // Still disabled after typing 0
      const input = screen.getByRole('textbox');
      await user.type(input, '0');
      expect(button).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<AmountInput {...defaultProps} />);
      
      const input = screen.getByLabelText('Payment Amount');
      expect(input).toBeInTheDocument();
    });

    it('has mobile-optimized input attributes', () => {
      render(<AmountInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('inputMode', 'decimal');
      expect(input).toHaveAttribute('pattern', '[0-9]*\\.?[0-9]*');
    });
  });
});