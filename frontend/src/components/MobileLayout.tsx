import React, { useEffect, useRef } from 'react';
import { useMobile } from '../hooks/useMobile';

interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
  enableWakeLock?: boolean;
  lockOrientation?: boolean;
  applySafeArea?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  className = '',
  enableWakeLock = false,
  lockOrientation = false,
  applySafeArea = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    features,
    isLandscape,
    requestWakeLock,
    releaseWakeLock,
    lockOrientation: lockOrientationFn,
    unlockOrientation,
    applySafeAreaPadding,
  } = useMobile();

  // Handle wake lock
  useEffect(() => {
    if (enableWakeLock && features.hasWakeLock) {
      requestWakeLock();
      
      return () => {
        releaseWakeLock();
      };
    }
  }, [enableWakeLock, features.hasWakeLock, requestWakeLock, releaseWakeLock]);

  // Handle orientation lock
  useEffect(() => {
    if (lockOrientation && features.hasScreenOrientation) {
      lockOrientationFn();
      
      return () => {
        unlockOrientation();
      };
    }
  }, [lockOrientation, features.hasScreenOrientation, lockOrientationFn, unlockOrientation]);

  // Apply safe area padding
  useEffect(() => {
    if (applySafeArea && containerRef.current) {
      applySafeAreaPadding(containerRef.current);
    }
  }, [applySafeArea, applySafeAreaPadding]);

  const baseClasses = [
    'min-h-screen',
    'w-full',
    'relative',
    // Prevent overscroll bounce on iOS
    'overscroll-none',
    // Smooth scrolling
    'scroll-smooth',
  ];

  const orientationClasses = isLandscape
    ? ['landscape-mode']
    : ['portrait-mode'];

  const allClasses = [
    ...baseClasses,
    ...orientationClasses,
    className,
  ].join(' ');

  return (
    <div
      ref={containerRef}
      className={allClasses}
      style={{
        // CSS custom properties for safe area
        paddingTop: applySafeArea ? 'env(safe-area-inset-top)' : undefined,
        paddingRight: applySafeArea ? 'env(safe-area-inset-right)' : undefined,
        paddingBottom: applySafeArea ? 'env(safe-area-inset-bottom)' : undefined,
        paddingLeft: applySafeArea ? 'env(safe-area-inset-left)' : undefined,
        // Prevent text size adjustment on iOS
        WebkitTextSizeAdjust: '100%',
        // Prevent tap highlight
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
      
      {/* Landscape warning for portrait-only apps */}
      {isLandscape && lockOrientation && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 text-center max-w-sm">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-lg font-semibold mb-2">Please rotate your device</h3>
            <p className="text-gray-600">
              This app works best in portrait mode for optimal user experience.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};