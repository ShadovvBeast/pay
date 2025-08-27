import React from 'react';
import { usePWA } from '../hooks/usePWA';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, queuedPayments } = usePWA();

  if (isOnline && queuedPayments.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium">
      {!isOnline ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span>You're offline. Payments will be queued.</span>
        </div>
      ) : queuedPayments.length > 0 ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span>
            {queuedPayments.length} payment{queuedPayments.length !== 1 ? 's' : ''} queued. 
            Processing when online...
          </span>
        </div>
      ) : null}
    </div>
  );
};