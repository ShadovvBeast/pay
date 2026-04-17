import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';

const errorMessages: Record<string, string> = {
  '1': 'Payment declined by your bank', '2': 'Insufficient funds', '3': 'Invalid card details',
  '4': 'Card expired', '5': 'Transaction timeout', '6': 'Payment cancelled by user',
};

export const PaymentFailure: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [details, setDetails] = useState<any>(null);
  const orderId = searchParams.get('order_id');
  const error = searchParams.get('error');
  const errorCode = searchParams.get('error_code');

  useEffect(() => { setDetails({ orderId, error, errorCode }); }, [orderId, error, errorCode]);
  const msg = error || (errorCode ? errorMessages[errorCode] || `Failed (code: ${errorCode})` : 'Payment could not be processed');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="glass rounded-2xl max-w-md w-full p-8 text-center animate-fade-up">
        <div className="h-16 w-16 rounded-full bg-destructive/15 flex items-center justify-center mx-auto mb-6">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="font-display text-3xl text-gradient mb-3">Payment Failed</h1>
        <p className="text-muted-foreground mb-6">{msg}</p>
        {details?.orderId && (
          <div className="rounded-xl bg-card p-4 mb-6 text-left text-sm">
            <p className="text-muted-foreground"><span className="text-foreground font-medium">Order:</span> {details.orderId}</p>
          </div>
        )}
        <div className="space-y-3">
          <Link to="/dashboard" className="btn-primary block w-full text-center">Try Again</Link>
          <Link to="/dashboard" className="btn-secondary block w-full text-center">Return to Dashboard</Link>
        </div>
        <div className="mt-6 rounded-xl bg-card p-4 border border-border">
          <h4 className="font-medium text-foreground text-sm mb-1">Need help?</h4>
          <p className="text-xs text-muted-foreground">Check your payment details or contact your bank.</p>
        </div>
      </div>
    </div>
  );
};
