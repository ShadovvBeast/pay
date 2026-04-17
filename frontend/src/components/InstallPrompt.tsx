import React, { useState } from 'react';
import { Smartphone } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

export const InstallPrompt: React.FC = () => {
  const { canInstall, isInstalled, installApp } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  if (!canInstall || isInstalled || isDismissed) return null;

  const handleInstall = async () => {
    setIsInstalling(true);
    try { await installApp(); } catch {} finally { setIsInstalling(false); }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 glass rounded-2xl p-4 z-40 shadow-elegant flex items-start gap-3">
      <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
        <Smartphone className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Install SB0 Pay</p>
        <p className="text-xs text-muted-foreground">Faster access and offline capability.</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={() => setIsDismissed(true)} disabled={isInstalling} className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors">Later</button>
        <button onClick={handleInstall} disabled={isInstalling} className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
          {isInstalling ? 'Installing…' : 'Install'}
        </button>
      </div>
    </div>
  );
};
