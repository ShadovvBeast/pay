// PWA Service for handling service worker registration and offline functionality

export interface QueuedPayment {
  id: string;
  data: {
    amount: number;
    timestamp: number;
  };
  timestamp: number;
}

class PWAService {
  private serviceWorker: ServiceWorker | null = null;
  private isOnline: boolean = navigator.onLine;
  private onlineCallbacks: (() => void)[] = [];
  private offlineCallbacks: (() => void)[] = [];

  constructor() {
    // Only setup listeners in browser environment
    if (typeof window !== 'undefined') {
      this.setupOnlineOfflineListeners();
    }
  }

  // Register service worker
  async registerServiceWorker(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully:', registration);

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available
              this.notifyUpdate();
            }
          });
        }
      });

      this.serviceWorker = registration.active;
      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  // Check if app can be installed
  canInstall(): boolean {
    return 'beforeinstallprompt' in window;
  }

  // Prompt user to install PWA
  async promptInstall(): Promise<boolean> {
    const event = (window as any).deferredPrompt;
    if (!event) {
      return false;
    }

    try {
      event.prompt();
      const result = await event.userChoice;
      (window as any).deferredPrompt = null;
      return result.outcome === 'accepted';
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  }

  // Queue payment for offline processing
  async queuePayment(paymentData: { amount: number }): Promise<string> {
    const payment: QueuedPayment = {
      id: crypto.randomUUID(),
      data: {
        ...paymentData,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };

    try {
      await this.saveToIndexedDB(payment);
      console.log('Payment queued for offline processing:', payment.id);
      return payment.id;
    } catch (error) {
      console.error('Failed to queue payment:', error);
      throw error;
    }
  }

  // Get queued payments
  async getQueuedPayments(): Promise<QueuedPayment[]> {
    try {
      return await this.getFromIndexedDB();
    } catch (error) {
      console.error('Failed to get queued payments:', error);
      return [];
    }
  }

  // Clear queued payments
  async clearQueuedPayments(): Promise<void> {
    try {
      await this.clearIndexedDB();
    } catch (error) {
      console.error('Failed to clear queued payments:', error);
    }
  }

  // Check online status
  isAppOnline(): boolean {
    return this.isOnline;
  }

  // Add online callback
  onOnline(callback: () => void): void {
    this.onlineCallbacks.push(callback);
  }

  // Add offline callback
  onOffline(callback: () => void): void {
    this.offlineCallbacks.push(callback);
  }

  // Remove callbacks
  removeOnlineCallback(callback: () => void): void {
    const index = this.onlineCallbacks.indexOf(callback);
    if (index > -1) {
      this.onlineCallbacks.splice(index, 1);
    }
  }

  removeOfflineCallback(callback: () => void): void {
    const index = this.offlineCallbacks.indexOf(callback);
    if (index > -1) {
      this.offlineCallbacks.splice(index, 1);
    }
  }

  // Private methods
  private setupOnlineOfflineListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('App is online');
      this.onlineCallbacks.forEach(callback => callback());
      
      // Trigger background sync if service worker is available
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
          return registration.sync.register('payment-sync');
        }).catch(error => {
          console.error('Background sync registration failed:', error);
        });
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('App is offline');
      this.offlineCallbacks.forEach(callback => callback());
    });
  }

  private notifyUpdate(): void {
    // Notify user about app update
    if (window.confirm('A new version of SB0 Pay is available. Reload to update?')) {
      window.location.reload();
    }
  }

  private async saveToIndexedDB(payment: QueuedPayment): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('sb0-pay-offline', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['payments'], 'readwrite');
        const store = transaction.objectStore('payments');
        const addRequest = store.add(payment);
        
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('payments')) {
          db.createObjectStore('payments', { keyPath: 'id' });
        }
      };
    });
  }

  private async getFromIndexedDB(): Promise<QueuedPayment[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('sb0-pay-offline', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['payments'], 'readonly');
        const store = transaction.objectStore('payments');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('payments')) {
          db.createObjectStore('payments', { keyPath: 'id' });
        }
      };
    });
  }

  private async clearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('sb0-pay-offline', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['payments'], 'readwrite');
        const store = transaction.objectStore('payments');
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      };
    });
  }
}

// Export singleton instance
export const pwaService = new PWAService();