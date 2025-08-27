import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock navigator and window APIs
const mockNavigator = {
  vibrate: vi.fn(),
  maxTouchPoints: 1,
  wakeLock: {
    request: vi.fn(),
  },
};

const mockWakeLock = {
  release: vi.fn(),
  addEventListener: vi.fn(),
};

const mockScreen = {
  orientation: {
    lock: vi.fn(),
    unlock: vi.fn(),
    angle: 0,
  },
};

const mockWindow = {
  screen: mockScreen,
  innerWidth: 375,
  innerHeight: 667,
  ontouchstart: {},
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mockDocument = {
  createElement: vi.fn(() => ({
    style: {},
  })),
  querySelector: vi.fn(),
  documentElement: {},
};

// Mock getComputedStyle
const mockGetComputedStyle = vi.fn(() => ({
  getPropertyValue: vi.fn(() => '0'),
}));

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
});

Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true,
});

Object.defineProperty(global, 'getComputedStyle', {
  value: mockGetComputedStyle,
  writable: true,
});

describe('Mobile Service', () => {
  let mobileService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockNavigator.wakeLock.request.mockResolvedValue(mockWakeLock);
    mockScreen.orientation.lock.mockResolvedValue(undefined);
    mockDocument.createElement.mockReturnValue({
      style: {},
    });

    // Import and create fresh instance after mocks are set up
    const { mobileService: MobileServiceClass } = await import('../services/mobile');
    // Create a new instance for testing
    const MobileService = (MobileServiceClass as any).constructor;
    mobileService = new MobileService();
  });

  describe('Feature Detection', () => {
    it('should detect mobile features correctly', () => {
      const features = mobileService.getFeatures();
      
      expect(features.hasHapticFeedback).toBe(true);
      expect(features.hasWakeLock).toBe(true);
      expect(features.hasScreenOrientation).toBe(true);
      expect(features.isTouchDevice).toBe(true);
    });
  });

  describe('Haptic Feedback', () => {
    it('should provide success haptic feedback', async () => {
      await mobileService.hapticFeedback('success');
      
      expect(mockNavigator.vibrate).toHaveBeenCalledWith([100]);
    });

    it('should provide error haptic feedback', async () => {
      await mobileService.hapticFeedback('error');
      
      expect(mockNavigator.vibrate).toHaveBeenCalledWith([100, 50, 100]);
    });

    it('should provide warning haptic feedback', async () => {
      await mobileService.hapticFeedback('warning');
      
      expect(mockNavigator.vibrate).toHaveBeenCalledWith([200]);
    });

    it('should handle vibration API errors gracefully', async () => {
      mockNavigator.vibrate.mockImplementation(() => {
        throw new Error('Vibration failed');
      });

      await expect(mobileService.hapticFeedback('success')).resolves.not.toThrow();
    });
  });

  describe('Wake Lock', () => {
    it('should request wake lock successfully', async () => {
      const result = await mobileService.requestWakeLock();
      
      expect(mockNavigator.wakeLock.request).toHaveBeenCalledWith('screen');
      expect(result).toBe(true);
    });

    it('should handle wake lock request failure', async () => {
      mockNavigator.wakeLock.request.mockRejectedValue(new Error('Wake lock failed'));
      
      const result = await mobileService.requestWakeLock();
      
      expect(result).toBe(false);
    });

    it('should release wake lock', async () => {
      await mobileService.requestWakeLock();
      await mobileService.releaseWakeLock();
      
      expect(mockWakeLock.release).toHaveBeenCalled();
    });
  });

  describe('Screen Orientation', () => {
    it('should lock orientation to portrait', async () => {
      const result = await mobileService.lockOrientation();
      
      expect(mockScreen.orientation.lock).toHaveBeenCalledWith('portrait-primary');
      expect(result).toBe(true);
    });

    it('should handle orientation lock failure', async () => {
      mockScreen.orientation.lock.mockRejectedValue(new Error('Lock failed'));
      
      const result = await mobileService.lockOrientation();
      
      expect(result).toBe(false);
    });

    it('should unlock orientation', async () => {
      await mobileService.unlockOrientation();
      
      expect(mockScreen.orientation.unlock).toHaveBeenCalled();
    });

    it('should detect landscape mode', () => {
      mockScreen.orientation.angle = 90;
      
      const isLandscape = mobileService.isLandscape();
      
      expect(isLandscape).toBe(true);
    });

    it('should detect portrait mode', () => {
      mockScreen.orientation.angle = 0;
      
      const isLandscape = mobileService.isLandscape();
      
      expect(isLandscape).toBe(false);
    });
  });

  describe('Touch Optimization', () => {
    it('should add touch optimization to element', () => {
      const element = document.createElement('div');
      
      mobileService.addTouchOptimization(element);
      
      expect(element.style.touchAction).toBe('manipulation');
      expect(element.style.userSelect).toBe('none');
      expect(element.style.webkitTouchCallout).toBe('none');
      expect(element.style.webkitUserSelect).toBe('none');
    });

    it('should remove touch optimization from element', () => {
      const element = document.createElement('div');
      mobileService.addTouchOptimization(element);
      
      mobileService.removeTouchOptimization(element);
      
      expect(element.style.touchAction).toBe('');
      expect(element.style.userSelect).toBe('');
      expect(element.style.webkitTouchCallout).toBe('');
      expect(element.style.webkitUserSelect).toBe('');
    });
  });
});