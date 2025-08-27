import { useState, useEffect } from 'react';
import { pwaService, QueuedPayment } from '../services/pwa';

export interface PWAState {
  isOnline: boolean;
  canInstall: boolean;
  isInstalled: boolean;
  queuedPayments: QueuedPayment[];
  isServiceWorkerReady: boolean;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isOnline: navigator.onLine,
    canInstall: false,
    isInstalled: false,
    queuedPayments: [],
    isServiceWorkerReady: false
  });

  useEffect(() => {
    // Initialize PWA service
    const initializePWA = async () => {
      try {
        const swRegistered = await pwaService.registerServiceWorker();
        setState(prev => ({ ...prev, isServiceWorkerReady: swRegistered }));

        // Check if app can be installed
        const canInstall = pwaService.canInstall();
        setState(prev => ({ ...prev, canInstall }));

        // Check if app is already installed
        const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                           (window.navigator as any).standalone === true;
        setState(prev => ({ ...prev, isInstalled }));

        // Load queued payments
        const queuedPayments = await pwaService.getQueuedPayments();
        setState(prev => ({ ...prev, queuedPayments }));
      } catch (error) {
        console.error('PWA initialization failed:', error);
      }
    };

    initializePWA();

    // Set up online/offline listeners
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      // Refresh queued payments when back online
      refreshQueuedPayments();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    pwaService.onOnline(handleOnline);
    pwaService.onOffline(handleOffline);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setState(prev => ({ ...prev, canInstall: true }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setState(prev => ({ ...prev, isInstalled: true, canInstall: false }));
      (window as any).deferredPrompt = null;
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      pwaService.removeOnlineCallback(handleOnline);
      pwaService.removeOfflineCallback(handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async (): Promise<boolean> => {
    try {
      const installed = await pwaService.promptInstall();
      if (installed) {
        setState(prev => ({ ...prev, isInstalled: true, canInstall: false }));
      }
      return installed;
    } catch (error) {
      console.error('App installation failed:', error);
      return false;
    }
  };

  const queuePayment = async (paymentData: { amount: number }): Promise<string> => {
    try {
      const paymentId = await pwaService.queuePayment(paymentData);
      await refreshQueuedPayments();
      return paymentId;
    } catch (error) {
      console.error('Failed to queue payment:', error);
      throw error;
    }
  };

  const refreshQueuedPayments = async (): Promise<void> => {
    try {
      const queuedPayments = await pwaService.getQueuedPayments();
      setState(prev => ({ ...prev, queuedPayments }));
    } catch (error) {
      console.error('Failed to refresh queued payments:', error);
    }
  };

  const clearQueuedPayments = async (): Promise<void> => {
    try {
      await pwaService.clearQueuedPayments();
      setState(prev => ({ ...prev, queuedPayments: [] }));
    } catch (error) {
      console.error('Failed to clear queued payments:', error);
    }
  };

  return {
    ...state,
    installApp,
    queuePayment,
    refreshQueuedPayments,
    clearQueuedPayments
  };
}