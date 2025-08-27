// Mobile UX enhancement service

export interface MobileFeatures {
  hasHapticFeedback: boolean;
  hasWakeLock: boolean;
  hasScreenOrientation: boolean;
  isTouchDevice: boolean;
}

class MobileService {
  private wakeLock: any = null;
  private features: MobileFeatures;

  constructor() {
    this.features = this.detectMobileFeatures();
  }

  // Detect available mobile features
  private detectMobileFeatures(): MobileFeatures {
    // Handle test environment where window/navigator might not be available
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        hasHapticFeedback: false,
        hasWakeLock: false,
        hasScreenOrientation: false,
        isTouchDevice: false,
      };
    }

    return {
      hasHapticFeedback: 'vibrate' in navigator,
      hasWakeLock: 'wakeLock' in navigator,
      hasScreenOrientation: 'screen' in window && 'orientation' in window.screen,
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    };
  }

  // Get available mobile features
  getFeatures(): MobileFeatures {
    return { ...this.features };
  }

  // Haptic feedback for successful actions
  async hapticFeedback(type: 'success' | 'error' | 'warning' = 'success'): Promise<void> {
    if (!this.features.hasHapticFeedback) {
      return;
    }

    try {
      const patterns = {
        success: [100], // Single short vibration
        error: [100, 50, 100], // Double vibration
        warning: [200], // Longer vibration
      };

      await navigator.vibrate(patterns[type]);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  // Screen wake lock during payment process
  async requestWakeLock(): Promise<boolean> {
    if (!this.features.hasWakeLock) {
      console.warn('Wake Lock API not supported');
      return false;
    }

    try {
      this.wakeLock = await (navigator as any).wakeLock.request('screen');
      
      this.wakeLock.addEventListener('release', () => {
        console.log('Screen wake lock was released');
      });

      console.log('Screen wake lock is active');
      return true;
    } catch (error) {
      console.error('Failed to request wake lock:', error);
      return false;
    }
  }

  // Release screen wake lock
  async releaseWakeLock(): Promise<void> {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        console.log('Screen wake lock released');
      } catch (error) {
        console.error('Failed to release wake lock:', error);
      }
    }
  }

  // Lock screen orientation to portrait
  async lockOrientation(): Promise<boolean> {
    if (!this.features.hasScreenOrientation) {
      console.warn('Screen Orientation API not supported');
      return false;
    }

    try {
      await (window.screen as any).orientation.lock('portrait-primary');
      console.log('Screen orientation locked to portrait');
      return true;
    } catch (error) {
      console.warn('Failed to lock screen orientation:', error);
      return false;
    }
  }

  // Unlock screen orientation
  async unlockOrientation(): Promise<void> {
    if (!this.features.hasScreenOrientation) {
      return;
    }

    try {
      (window.screen as any).orientation.unlock();
      console.log('Screen orientation unlocked');
    } catch (error) {
      console.warn('Failed to unlock screen orientation:', error);
    }
  }

  // Prevent zoom on input focus (iOS Safari)
  preventZoomOnInput(): void {
    if (typeof document === 'undefined') return;
    
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      const content = viewport.getAttribute('content');
      if (content && !content.includes('user-scalable=no')) {
        viewport.setAttribute('content', content + ', user-scalable=no');
      }
    }
  }

  // Restore zoom capability
  allowZoomOnInput(): void {
    if (typeof document === 'undefined') return;
    
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      const content = viewport.getAttribute('content');
      if (content) {
        const newContent = content.replace(', user-scalable=no', '').replace('user-scalable=no,', '').replace('user-scalable=no', '');
        viewport.setAttribute('content', newContent);
      }
    }
  }

  // Add touch-optimized styles to elements
  addTouchOptimization(element: HTMLElement): void {
    element.style.touchAction = 'manipulation';
    element.style.userSelect = 'none';
    element.style.webkitTouchCallout = 'none';
    element.style.webkitUserSelect = 'none';
  }

  // Remove touch optimization
  removeTouchOptimization(element: HTMLElement): void {
    element.style.touchAction = '';
    element.style.userSelect = '';
    element.style.webkitTouchCallout = '';
    element.style.webkitUserSelect = '';
  }

  // Check if device is in landscape mode
  isLandscape(): boolean {
    if (typeof window === 'undefined') return false;
    
    if (this.features.hasScreenOrientation) {
      return (window.screen as any).orientation.angle === 90 || (window.screen as any).orientation.angle === -90;
    }
    return window.innerWidth > window.innerHeight;
  }

  // Get safe area insets for devices with notches
  getSafeAreaInsets(): { top: number; right: number; bottom: number; left: number } {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }
    
    const computedStyle = getComputedStyle(document.documentElement);
    
    return {
      top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0', 10),
      right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0', 10),
      bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0', 10),
      left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0', 10),
    };
  }

  // Add safe area padding to element
  applySafeAreaPadding(element: HTMLElement): void {
    const insets = this.getSafeAreaInsets();
    element.style.paddingTop = `max(${element.style.paddingTop || '0px'}, ${insets.top}px)`;
    element.style.paddingRight = `max(${element.style.paddingRight || '0px'}, ${insets.right}px)`;
    element.style.paddingBottom = `max(${element.style.paddingBottom || '0px'}, ${insets.bottom}px)`;
    element.style.paddingLeft = `max(${element.style.paddingLeft || '0px'}, ${insets.left}px)`;
  }
}

// Export singleton instance
export const mobileService = new MobileService();