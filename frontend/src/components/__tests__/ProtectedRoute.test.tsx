import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAuth } from '../../hooks/useAuth';

// Mock the useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = useAuth as any;

describe('ProtectedRoute', () => {
  it('shows loading state when authentication is loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('shows default authentication required message when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    expect(screen.getByText('Please sign in to access this page.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders custom fallback when not authenticated and fallback is provided', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    const customFallback = <div>Custom Login Page</div>;

    render(
      <ProtectedRoute fallback={customFallback}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Custom Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});