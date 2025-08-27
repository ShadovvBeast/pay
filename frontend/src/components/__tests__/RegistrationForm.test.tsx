import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegistrationForm } from '../RegistrationForm';
import { authService } from '../../services/auth';

// Mock the auth service
vi.mock('../../services/auth', () => ({
    authService: {
        register: vi.fn(),
    },
}));

const mockOnSuccess = vi.fn();
const mockOnError = vi.fn();

describe('RegistrationForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the first step of registration form', () => {
        render(<RegistrationForm onSuccess={mockOnSuccess} onError={mockOnError} />);

        expect(screen.getByText('Create Account')).toBeInTheDocument();
        expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
        expect(screen.getByText('Shop Information')).toBeInTheDocument();
        expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/owner name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it('validates required fields in step 1', async () => {
        const user = userEvent.setup();
        render(<RegistrationForm onSuccess={mockOnSuccess} onError={mockOnError} />);

        const nextButton = screen.getByText('Next');
        expect(nextButton).toBeDisabled();

        // Fill in shop name and check if validation works
        const shopNameInput = screen.getByLabelText(/shop name/i);
        await user.type(shopNameInput, 'Test Shop');
        await user.tab(); // Trigger blur event

        expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
    });

    it('shows validation errors for invalid email', async () => {
        const user = userEvent.setup();
        render(<RegistrationForm onSuccess={mockOnSuccess} onError={mockOnError} />);

        const emailInput = screen.getByLabelText(/email address/i);
        await user.type(emailInput, 'invalid-email');
        await user.tab();

        expect(screen.getByText('Invalid format')).toBeInTheDocument();
    });

    it('validates password requirements', async () => {
        const user = userEvent.setup();
        render(<RegistrationForm onSuccess={mockOnSuccess} onError={mockOnError} />);

        const passwordInput = screen.getByLabelText(/^password/i);
        await user.type(passwordInput, 'weakpassword');
        await user.tab();

        expect(screen.getByText('Password must contain at least one uppercase letter, one lowercase letter, and one number')).toBeInTheDocument();
    });

    it('validates password confirmation', async () => {
        const user = userEvent.setup();
        render(<RegistrationForm onSuccess={mockOnSuccess} onError={mockOnError} />);

        const passwordInput = screen.getByLabelText(/^password/i);
        const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

        await user.type(passwordInput, 'StrongPass123');
        await user.type(confirmPasswordInput, 'DifferentPass123');
        await user.tab();

        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    it('toggles password visibility', async () => {
        const user = userEvent.setup();
        render(<RegistrationForm onSuccess={mockOnSuccess} onError={mockOnError} />);

        const passwordInput = screen.getByLabelText(/^password/i);
        const toggleButton = passwordInput.parentElement?.querySelector('button');

        expect(passwordInput).toHaveAttribute('type', 'password');

        if (toggleButton) {
            await user.click(toggleButton);
            expect(passwordInput).toHaveAttribute('type', 'text');
        }
    });

    it('proceeds to step 2 when step 1 is valid', async () => {
        const user = userEvent.setup();
        render(<RegistrationForm onSuccess={mockOnSuccess} onError={mockOnError} />);

        // Fill in all required fields for step 1
        await user.type(screen.getByLabelText(/shop name/i), 'Test Shop');
        await user.type(screen.getByLabelText(/owner name/i), 'John Doe');
        await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
        await user.type(screen.getByLabelText(/^password/i), 'StrongPass123');
        await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass123');

        const nextButton = screen.getByText('Next');
        await user.click(nextButton);

        expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
        expect(screen.getByText('AllPay Configuration')).toBeInTheDocument();
    });

    it('renders step 2 with AllPay configuration fields', async () => {
        const user = userEvent.setup();
        render(<RegistrationForm onSuccess={mockOnSuccess} onError={mockOnError} />);

        // Navigate to step 2
        await user.type(screen.getByLabelText(/shop name/i), 'Test Shop');
        await user.type(screen.getByLabelText(/owner name/i), 'John Doe');
        await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
        await user.type(screen.getByLabelText(/^password/i), 'StrongPass123');
        await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass123');
        await user.click(screen.getByText('Next'));

        expect(screen.getByLabelText(/merchant id/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/terminal id/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/success url/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/failure url/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/notification url/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
    });

    it('validates URL fields in step 2', async () => {
        const user = userEvent.setup();
        render(<RegistrationForm onSuccess={mockOnSuccess} onError={mockOnError} />);

        // Navigate to step 2
        await user.type(screen.getByLabelText(/shop name/i), 'Test Shop');
        await user.type(screen.getByLabelText(/owner name/i), 'John Doe');
        await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
        await user.type(screen.getByLabelText(/^password/i), 'StrongPass123');
        await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass123');
        await user.click(screen.getByText('Next'));

        const successUrlInput = screen.getByLabelText(/success url/i);
        await user.type(successUrlInput, 'invalid-url');
        await user.tab();

        expect(screen.getByText('Invalid format')).toBeInTheDocument();
    });

    it('goes back to step 1 when back button is clicked', async () => {
        const user = userEvent.setup();
        render(<RegistrationForm onSuccess={mockOnSuccess} onError={mockOnError} />);

        // Navigate to step 2
        await user.type(screen.getByLabelText(/shop name/i), 'Test Shop');
        await user.type(screen.getByLabelText(/owner name/i), 'John Doe');
        await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
        await user.type(screen.getByLabelText(/^password/i), 'StrongPass123');
        await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass123');
        await user.click(screen.getByText('Next'));

        const backButton = screen.getByText('Back');
        await user.click(backButton);

        expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
        expect(screen.getByText('Shop Information')).toBeInTheDocument();
    });

    it('submits the form successfully', async () => {
        const user = userEvent.setup();
        const mockUser = { id: '1', email: 'john@example.com', shopName: 'Test Shop' };
        (authService.register as any).mockResolvedValue({ user: mockUser, token: 'test-token' });

        render(<RegistrationForm onSuccess={mockOnSuccess} onError={mockOnError} />);

        // Fill step 1
        await user.type(screen.getByLabelText(/shop name/i), 'Test Shop');
        await user.type(screen.getByLabelText(/owner name/i), 'John Doe');
        await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
        await user.type(screen.getByLabelText(/^password/i), 'StrongPass123');
        await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass123');
        await user.click(screen.getByText('Next'));

        // Fill step 2
        await user.type(screen.getByLabelText(/merchant id/i), 'MERCHANT123');
        await user.type(screen.getByLabelText(/terminal id/i), 'TERMINAL123');
        await user.type(screen.getByLabelText(/success url/i), 'https://example.com/success');
        await user.type(screen.getByLabelText(/failure url/i), 'https://example.com/failure');
        await user.type(screen.getByLabelText(/notification url/i), 'https://example.com/notification');

        const submitButton = screen.getByRole('button', { name: 'Create Account' });
        await user.click(submitButton);

        await waitFor(() => {
            expect(authService.register).toHaveBeenCalledWith({
                email: 'john@example.com',
                password: 'StrongPass123',
                confirmPassword: 'StrongPass123',
                shopName: 'Test Shop',
                ownerName: 'John Doe',
                merchantConfig: {
                    merchantId: 'MERCHANT123',
                    terminalId: 'TERMINAL123',
                    successUrl: 'https://example.com/success',
                    failureUrl: 'https://example.com/failure',
                    notificationUrl: 'https://example.com/notification',
                    currency: 'TRY',
                    language: 'tr',
                },
            });
            expect(mockOnSuccess).toHaveBeenCalledWith(mockUser);
        });
    });

    it('handles registration error', async () => {
        const user = userEvent.setup();
        const errorMessage = 'Email already exists';
        (authService.register as any).mockRejectedValue(new Error(errorMessage));

        render(<RegistrationForm onSuccess={mockOnSuccess} onError={mockOnError} />);

        // Fill and submit form
        await user.type(screen.getByLabelText(/shop name/i), 'Test Shop');
        await user.type(screen.getByLabelText(/owner name/i), 'John Doe');
        await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
        await user.type(screen.getByLabelText(/^password/i), 'StrongPass123');
        await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass123');
        await user.click(screen.getByText('Next'));

        await user.type(screen.getByLabelText(/merchant id/i), 'MERCHANT123');
        await user.type(screen.getByLabelText(/terminal id/i), 'TERMINAL123');
        await user.type(screen.getByLabelText(/success url/i), 'https://example.com/success');
        await user.type(screen.getByLabelText(/failure url/i), 'https://example.com/failure');
        await user.type(screen.getByLabelText(/notification url/i), 'https://example.com/notification');

        await user.click(screen.getByRole('button', { name: 'Create Account' }));

        await waitFor(() => {
            expect(mockOnError).toHaveBeenCalledWith(errorMessage);
        });
    });
});