import React from 'react';
import { Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallPrompt: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, installPWA } = usePWAInstall();
  if (isInstalled || !isInstallable) return null;

  return (
    <div className={`glass rounded-2xl p-4 flex items-center gap-3 ${className}`}>
      <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
        <Smartphone className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Install SB0 Pay</p>
        <p className="text-xs text-muted-foreground">Add to home screen for one-tap access.</p>
      </div>
      <button onClick={() => installPWA()} className="px-3 py-1.5 rounded-full border border-border text-sm hover:bg-secondary transition-colors">Install</button>
    </div>
  );
};
