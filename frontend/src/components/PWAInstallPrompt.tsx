import React from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallPromptProps {
  className?: string;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ className = '' }) => {
  const { isInstallable, isInstalled, installPWA } = usePWAInstall();

  if (isInstalled || !isInstallable) {
    return null;
  }

  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      console.log('PWA installed successfully');
    }
  };

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Install SB0 Pay
            </h3>
            <p className="text-sm text-blue-700">
              Add to your home screen for quick access
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={handleInstall}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
};