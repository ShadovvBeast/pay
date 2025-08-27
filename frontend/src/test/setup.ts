import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window object for tests
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

// Mock crypto.randomUUID
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-123'),
  },
});

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
});

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    onLine: true,
    serviceWorker: {
      register: vi.fn(),
      ready: Promise.resolve({
        installing: null,
        waiting: null,
        active: null,
        scope: '/',
        addEventListener: vi.fn(),
        sync: {
          register: vi.fn(),
        },
      }),
    },
  },
  writable: true,
});