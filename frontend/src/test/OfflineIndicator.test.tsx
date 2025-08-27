import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineIndicator } from '../components/OfflineIndicator';
import * as usePWAModule from '../hooks/usePWA';

// Mock the usePWA hook
vi.mock('../hooks/usePWA');

describe('OfflineIndicator Component', () => {
  const mockUsePWA = usePWAModule.usePWA as any;

  it('should not render when online with no queued payments', () => {
    mockUsePWA.mockReturnValue({
      isOnline: true,
      queuedPayments: [],
    });

    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('should render offline message when offline', () => {
    mockUsePWA.mockReturnValue({
      isOnline: false,
      queuedPayments: [],
    });

    render(<OfflineIndicator />);
    expect(screen.getByText("You're offline. Payments will be queued.")).toBeInTheDocument();
  });

  it('should render queued payments message when online with queued payments', () => {
    mockUsePWA.mockReturnValue({
      isOnline: true,
      queuedPayments: [
        { id: '1', data: { amount: 100 }, timestamp: Date.now() },
        { id: '2', data: { amount: 200 }, timestamp: Date.now() },
      ],
    });

    render(<OfflineIndicator />);
    expect(screen.getByText(/2 payments queued/)).toBeInTheDocument();
  });

  it('should render singular payment message for one queued payment', () => {
    mockUsePWA.mockReturnValue({
      isOnline: true,
      queuedPayments: [
        { id: '1', data: { amount: 100 }, timestamp: Date.now() },
      ],
    });

    render(<OfflineIndicator />);
    expect(screen.getByText(/1 payment queued/)).toBeInTheDocument();
  });
});