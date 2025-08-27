import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';

const mockOnSuccess = vi.fn();
const mockOnError = vi.fn();
const mockOnLogin = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('renders login form correctly', () => {
    render(
      <LoginForm 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
        onLogin={mockOnLogin} 
      />
    );
    
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your SB0 Pay account')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(
      <LoginForm 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
        onLogin={mockOnLogin} 
      />
    );
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    expect(submitButton).toBeDisabled();
    
    // Fill in email
    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'test@example.com');
    
    // Submit button should still be disabled without password
    expect(submitButton).toBeDisabled();
    
    // Fill in password
    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(passwordInput, 'password123');
    
    // Now submit button should be enabled
    expect(submitButton).not.toBeDisabled();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(
      <LoginForm 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
        onLogin={mockOnLogin} 
      />
    );
    
    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab();
    
    expect(screen.getByText('Invalid format')).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(
      <LoginForm 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
        onLogin={mockOnLogin} 
      />
    );
    
    const passwordInput = screen.getByLabelText(/password/i);
    const toggleButton = passwordInput.parentElement?.querySelector('button');
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    if (toggleButton) {
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
      
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  it('handles remember me functionality', async () => {
    const user = userEvent.setup();
    render(
      <LoginForm 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
        onLogin={mockOnLogin} 
      />
    );
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const rememberCheckbox = screen.getByLabelText(/remember me/i);
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(rememberCheckbox);
    
    mockOnLogin.mockResolvedValue(undefined);
    
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('remember_email', 'test@example.com');
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('does not save email when remember me is unchecked', async () => {
    const user = userEvent.setup();
    render(
      <LoginForm 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
        onLogin={mockOnLogin} 
      />
    );
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    
    mockOnLogin.mockResolvedValue(undefined);
    
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('remember_email');
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('loads remembered email on mount', () => {
    localStorageMock.getItem.mockReturnValue('remembered@example.com');
    
    render(
      <LoginForm 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
        onLogin={mockOnLogin} 
      />
    );
    
    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    const rememberCheckbox = screen.getByLabelText(/remember me/i) as HTMLInputElement;
    
    expect(emailInput.value).toBe('remembered@example.com');
    expect(rememberCheckbox.checked).toBe(true);
  });

  it('handles login error', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Invalid credentials';
    
    render(
      <LoginForm 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
        onLogin={mockOnLogin} 
      />
    );
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    
    mockOnLogin.mockRejectedValue(new Error(errorMessage));
    
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith('test@example.com', 'wrongpassword');
      expect(mockOnError).toHaveBeenCalledWith(errorMessage);
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    
    render(
      <LoginForm 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
        onLogin={mockOnLogin} 
      />
    );
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    
    // Mock a delayed login
    mockOnLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    await user.click(submitButton);
    
    // Check loading state
    expect(screen.getByText('Signing in...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('disables form during submission', async () => {
    const user = userEvent.setup();
    
    render(
      <LoginForm 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
        onLogin={mockOnLogin} 
      />
    );
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const rememberCheckbox = screen.getByLabelText(/remember me/i);
    const forgotPasswordButton = screen.getByText('Forgot password?');
    const createAccountButton = screen.getByText('Create one');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    
    // Mock a delayed login
    mockOnLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    await user.click(submitButton);
    
    // All form elements should be disabled during submission
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(rememberCheckbox).toBeDisabled();
    expect(forgotPasswordButton).toBeDisabled();
    expect(createAccountButton).toBeDisabled();
    expect(submitButton).toBeDisabled();
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});