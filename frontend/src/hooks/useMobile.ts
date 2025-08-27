import { useState, useEffect, useCallback } from 'react';
import { mobileService, MobileFeatures } from '../services/mobile';

export interface MobileState {
  features: MobileFeatures;
  isWakeLockActive: boolean;
  isOrientationLocked: boolean;
  isLandscape: boolean;
}

export function useMobile() {
  const [state, setState] = useState<MobileState>({
    features: mobileService.getFeatures(),
    isWakeLockActive: false,
    isOrientationLocked: false,
    isLandscape: mobileService.isLandscape(),
  });

  // Update landscape state on orientation change
  useEffect(() => {
    const handleOrientationChange = () => {
      setState(prev => ({
        ...prev,
        isLandscape: mobileService.isLandscape(),
      }));
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  // Haptic feedback
  const hapticFeedback = useCallback(async (type: 'success' | 'error' | 'warning' = 'success') => {
    await mobileService.hapticFeedback(type);
  }, []);

  // Wake lock management
  const requestWakeLock = useCallback(async () => {
    const success = await mobileService.requestWakeLock();
    setState(prev => ({ ...prev, isWakeLockActive: success }));
    return success;
  }, []);

  const releaseWakeLock = useCallback(async () => {
    await mobileService.releaseWakeLock();
    setState(prev => ({ ...prev, isWakeLockActive: false }));
  }, []);

  // Orientation lock management
  const lockOrientation = useCallback(async () => {
    const success = await mobileService.lockOrientation();
    setState(prev => ({ ...prev, isOrientationLocked: success }));
    return success;
  }, []);

  const unlockOrientation = useCallback(async () => {
    await mobileService.unlockOrientation();
    setState(prev => ({ ...prev, isOrientationLocked: false }));
  }, []);

  // Touch optimization
  const addTouchOptimization = useCallback((element: HTMLElement) => {
    mobileService.addTouchOptimization(element);
  }, []);

  const removeTouchOptimization = useCallback((element: HTMLElement) => {
    mobileService.removeTouchOptimization(element);
  }, []);

  // Zoom prevention
  const preventZoom = useCallback(() => {
    mobileService.preventZoomOnInput();
  }, []);

  const allowZoom = useCallback(() => {
    mobileService.allowZoomOnInput();
  }, []);

  // Safe area utilities
  const getSafeAreaInsets = useCallback(() => {
    return mobileService.getSafeAreaInsets();
  }, []);

  const applySafeAreaPadding = useCallback((element: HTMLElement) => {
    mobileService.applySafeAreaPadding(element);
  }, []);

  return {
    ...state,
    hapticFeedback,
    requestWakeLock,
    releaseWakeLock,
    lockOrientation,
    unlockOrientation,
    addTouchOptimization,
    removeTouchOptimization,
    preventZoom,
    allowZoom,
    getSafeAreaInsets,
    applySafeAreaPadding,
  };
}