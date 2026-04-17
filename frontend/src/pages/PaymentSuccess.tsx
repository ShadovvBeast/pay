import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

export const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [details, setDetails] = useState<any>(null);
  const orderId = searchParams.get('order_id');
  const transactionId = searchParams.get('transaction_id');
  const amount = searchParams.get('amount');
  const currency = searchParams.get('currency');

  useEffect(() => { if (orderId || transactionId) setDetails({ orderId, transactionId, amount, currency }); }, [orderId, transactionId, amount, currency]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="glass rounded-2xl max-w-md w-full p-8 text-center animate-fade-up">
        <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-display text-3xl text-gradient mb-3">Payment Successful!</h1>
        <p className="text-muted-foreground mb-6">Your payment has been processed. Thank you!</p>
        {details && (
          <div className="rounded-xl bg-card p-4 mb-6 text-left text-sm space-y-1">
            <h3 className="font-semibold text-foreground mb-2">Details</h3>
            {details.orderId && <p className="text-muted-foreground"><span className="text-foreground font-medium">Order:</span> {details.orderId}</p>}
            {details.transactionId && <p className="text-muted-foreground"><span className="text-foreground font-medium">Transaction:</span> {details.transactionId}</p>}
            {details.amount && <p className="text-muted-foreground"><span className="text-foreground font-medium">Amount:</span> {details.amount} {details.currency || 'ILS'}</p>}
          </div>
        )}
        <div className="space-y-3">
          <Link to="/dashboard" className="btn-primary block w-full text-center">Return to Dashboard</Link>
          <button onClick={() => window.print()} className="btn-secondary w-full">Print Receipt</button>
        </div>
        <p className="text-xs text-muted-foreground mt-6">Questions? Contact support.</p>
      </div>
    </div>
  );
};
