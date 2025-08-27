import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMobile } from '../hooks/useMobile';
import * as mobileServiceModule from '../services/mobile';

// Mock the mobile service
vi.mock('../services/mobile', () => ({
  mobileService: {
    getFeatures: vi.fn(),
    hapticFeedback: vi.fn(),
    requestWakeLock: vi.fn(),
    releaseWakeLock: vi.fn(),
    lockOrientation: vi.fn(),
    unlockOrientation: vi.fn(),
    addTouchOptimization: vi.fn(),
    removeTouchOptimization: vi.fn(),
    preventZoomOnInput: vi.fn(),
    allowZoomOnInput: vi.fn(),
    getSafeAreaInsets: vi.fn(),
    applySafeAreaPadding: vi.fn(),
    isLandscape: vi.fn(),
  },
}));

describe('useMobile Hook', () => {
  const mockMobileService = mobileServiceModule.mobileService as any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock implementations
    mockMobileService.getFeatures.mockReturnValue({
      hasHapticFeedback: true,
      hasWakeLock: true,
      hasScreenOrientation: true,
      isTouchDevice: true,
    });
    mockMobileService.isLandscape.mockReturnValue(false);
    mockMobileService.requestWakeLock.mockResolvedValue(true);
    mockMobileService.lockOrientation.mockResolvedValue(true);
    mockMobileService.getSafeAreaInsets.mockReturnValue({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });

  it('should initialize mobile state correctly', () => {
    const { result } = renderHook(() => useMobile());

    expect(result.current.features.hasHapticFeedback).toBe(true);
    expect(result.current.features.hasWakeLock).toBe(true);
    expect(result.current.features.hasScreenOrientation).toBe(true);
    expect(result.current.features.isTouchDevice).toBe(true);
    expect(result.current.isWakeLockActive).toBe(false);
    expect(result.current.isOrientationLocked).toBe(false);
    expect(result.current.isLandscape).toBe(false);
  });

  it('should provide haptic feedback', async () => {
    const { result } = renderHook(() => useMobile());

    await act(async () => {
      await result.current.hapticFeedback('success');
    });

    expect(mockMobileService.hapticFeedback).toHaveBeenCalledWith('success');
  });

  it('should request wake lock', async () => {
    const { result } = renderHook(() => useMobile());

    await act(async () => {
      const success = await result.current.requestWakeLock();
      expect(success).toBe(true);
    });

    expect(mockMobileService.requestWakeLock).toHaveBeenCalled();
    expect(result.current.isWakeLockActive).toBe(true);
  });

  it('should release wake lock', async () => {
    const { result } = renderHook(() => useMobile());

    await act(async () => {
      await result.current.releaseWakeLock();
    });

    expect(mockMobileService.releaseWakeLock).toHaveBeenCalled();
    expect(result.current.isWakeLockActive).toBe(false);
  });

  it('should lock orientation', async () => {
    const { result } = renderHook(() => useMobile());

    await act(async () => {
      const success = await result.current.lockOrientation();
      expect(success).toBe(true);
    });

    expect(mockMobileService.lockOrientation).toHaveBeenCalled();
    expect(result.current.isOrientationLocked).toBe(true);
  });

  it('should unlock orientation', async () => {
    const { result } = renderHook(() => useMobile());

    await act(async () => {
      await result.current.unlockOrientation();
    });

    expect(mockMobileService.unlockOrientation).toHaveBeenCalled();
    expect(result.current.isOrientationLocked).toBe(false);
  });

  it('should handle touch optimization', () => {
    const { result } = renderHook(() => useMobile());
    const element = document.createElement('div');

    act(() => {
      result.current.addTouchOptimization(element);
    });

    expect(mockMobileService.addTouchOptimization).toHaveBeenCalledWith(element);

    act(() => {
      result.current.removeTouchOptimization(element);
    });

    expect(mockMobileService.removeTouchOptimization).toHaveBeenCalledWith(element);
  });

  it('should handle zoom prevention', () => {
    const { result } = renderHook(() => useMobile());

    act(() => {
      result.current.preventZoom();
    });

    expect(mockMobileService.preventZoomOnInput).toHaveBeenCalled();

    act(() => {
      result.current.allowZoom();
    });

    expect(mockMobileService.allowZoomOnInput).toHaveBeenCalled();
  });
});