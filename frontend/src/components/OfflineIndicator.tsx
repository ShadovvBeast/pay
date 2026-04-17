import React from 'react';
import { WifiOff } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, queuedPayments } = usePWA();
  if (isOnline && queuedPayments.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive/90 backdrop-blur text-destructive-foreground px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff className="h-3.5 w-3.5" />
      {!isOnline
        ? "You're offline. Payments will be queued."
        : `${queuedPayments.length} payment${queuedPayments.length !== 1 ? 's' : ''} queued. Processing…`}
    </div>
  );
};
