import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePWA } from '../hooks/usePWA';
import * as pwaServiceModule from '../services/pwa';

// Mock the PWA service
vi.mock('../services/pwa', () => ({
  pwaService: {
    registerServiceWorker: vi.fn(),
    canInstall: vi.fn(),
    promptInstall: vi.fn(),
    queuePayment: vi.fn(),
    getQueuedPayments: vi.fn(),
    clearQueuedPayments: vi.fn(),
    onOnline: vi.fn(),
    onOffline: vi.fn(),
    removeOnlineCallback: vi.fn(),
    removeOfflineCallback: vi.fn(),
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    onLine: true,
    standalone: false,
  },
  writable: true,
});

describe('usePWA Hook', () => {
  const mockPwaService = pwaServiceModule.pwaService as any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock implementations
    mockPwaService.registerServiceWorker.mockResolvedValue(true);
    mockPwaService.canInstall.mockReturnValue(false);
    mockPwaService.getQueuedPayments.mockResolvedValue([]);
    mockPwaService.queuePayment.mockResolvedValue('test-payment-id');
    mockPwaService.promptInstall.mockResolvedValue(true);
  }); 
 it('should initialize PWA state correctly', async () => {
    const { result } = renderHook(() => usePWA());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.canInstall).toBe(false);
    expect(result.current.isInstalled).toBe(false);
    expect(result.current.queuedPayments).toEqual([]);
    expect(result.current.isServiceWorkerReady).toBe(false);
  });

  it('should register service worker on mount', async () => {
    renderHook(() => usePWA());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockPwaService.registerServiceWorker).toHaveBeenCalled();
  });

  it('should detect app installation capability', async () => {
    mockPwaService.canInstall.mockReturnValue(true);

    const { result } = renderHook(() => usePWA());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.canInstall).toBe(true);
  });

  it('should handle app installation', async () => {
    mockPwaService.canInstall.mockReturnValue(true);
    mockPwaService.promptInstall.mockResolvedValue(true);

    const { result } = renderHook(() => usePWA());

    await act(async () => {
      const installed = await result.current.installApp();
      expect(installed).toBe(true);
    });

    expect(mockPwaService.promptInstall).toHaveBeenCalled();
  });

  it('should queue payments', async () => {
    const { result } = renderHook(() => usePWA());
    const paymentData = { amount: 100 };

    await act(async () => {
      const paymentId = await result.current.queuePayment(paymentData);
      expect(paymentId).toBe('test-payment-id');
    });

    expect(mockPwaService.queuePayment).toHaveBeenCalledWith(paymentData);
  });

  it('should clear queued payments', async () => {
    const { result } = renderHook(() => usePWA());

    await act(async () => {
      await result.current.clearQueuedPayments();
    });

    expect(mockPwaService.clearQueuedPayments).toHaveBeenCalled();
  });
});