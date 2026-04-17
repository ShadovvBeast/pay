import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAStatusProps { className?: string; }

export const PWAStatus: React.FC<PWAStatusProps> = ({ className = '' }) => {
  const isOnline = useOnlineStatus();
  const { isInstalled } = usePWAInstall();

  return (
    <div className={`flex items-center gap-3 text-xs ${className}`}>
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-primary animate-pulse' : 'bg-destructive'}`} />
        {isOnline ? 'Online' : 'Offline'}
      </span>
      {isInstalled && (
        <span className="text-muted-foreground">· App installed</span>
      )}
    </div>
  );
};
