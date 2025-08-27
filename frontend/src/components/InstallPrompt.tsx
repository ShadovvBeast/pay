import React, { useState } from 'react';
import { usePWA } from '../hooks/usePWA';

export const InstallPrompt: React.FC = () => {
  const { canInstall, isInstalled, installApp } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (!canInstall || isInstalled || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await installApp();
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white rounded-lg shadow-lg p-4 z-40">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Install SB0 Pay</h3>
          <p className="text-xs opacity-90">
            Install the app for faster access and offline capability
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDismiss}
            className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10 transition-colors"
            disabled={isInstalling}
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="text-xs px-3 py-1 rounded bg-white text-blue-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {isInstalling ? 'Installing...' : 'Install'}
          </button>
        </div>
      </div>
    </div>
  );
};