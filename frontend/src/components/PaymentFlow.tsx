import React, { useState, useEffect } from 'react';
import { AmountInput } from './AmountInput';
import { QRCodeDisplay } from './QRCodeDisplay';
import { usePayment } from '../hooks/usePayment';
import { useAuth } from '../hooks/useAuth';

export interface PaymentFlowProps {
  onPaymentComplete?: (transactionId: string) => void;
  onPaymentError?: (error: string) => void;
}

type Step = 'amount' | 'qr';

export const PaymentFlow: React.FC<PaymentFlowProps> = ({ onPaymentComplete, onPaymentError }) => {
  const { user } = useAuth();
  const { state, createPayment, clearPayment, clearError } = usePayment();
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState('');
  const currency = user?.merchantConfig?.currency || 'ILS';
  const SYM: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', UGX: 'USh' };

  useEffect(() => {
    if (state.paymentStatus) {
      const s = state.paymentStatus.transaction.status;
      if (s === 'completed') onPaymentComplete?.(state.paymentStatus.transaction.id);
      else if (s === 'failed' || s === 'cancelled') onPaymentError?.(s === 'failed' ? 'Payment failed.' : 'Payment cancelled.');
    }
  }, [state.paymentStatus, onPaymentComplete, onPaymentError]);

  useEffect(() => { if (state.error) onPaymentError?.(state.error); }, [state.error, onPaymentError]);

  const handleSubmit = async (v: number) => {
    try { await createPayment({ amount: v, description: `Payment from ${user?.shopName || 'SB0 Pay'}` }); setStep('qr'); } catch {}
  };
  const reset = () => { clearPayment(); clearError(); setAmount(''); setStep('amount'); };

  if (step === 'qr' && state.isLoading && !state.currentPayment) {
    return (
      <div className="w-full max-w-md mx-auto glass rounded-2xl p-8 text-center">
        <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Creating Payment</h2>
        <p className="text-muted-foreground mb-4">Generating your payment link…</p>
        <div className="text-2xl font-display text-primary">{SYM[currency] || currency}{parseFloat(amount || '0').toFixed(2)}</div>
      </div>
    );
  }

  if (step === 'qr' && state.currentPayment) {
    return (
      <div className="space-y-4">
        <QRCodeDisplay paymentUrl={state.currentPayment.paymentUrl} amount={state.currentPayment.transaction.amount} currency={state.currentPayment.transaction.currency} onNewPayment={reset} isLoading={false} error={state.error || undefined} />
        {state.isPolling && (
          <div className="w-full max-w-md mx-auto glass rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1"><span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span className="text-foreground font-medium text-sm">Waiting for payment…</span></div>
            <p className="text-muted-foreground text-xs">We'll update automatically when received.</p>
          </div>
        )}
        {state.paymentStatus && (
          <div className="w-full max-w-md mx-auto">
            {state.paymentStatus.transaction.status === 'completed' && (
              <div className="glass rounded-2xl p-6 text-center border border-primary/30">
                <div className="text-4xl mb-2">✅</div>
                <h3 className="text-primary font-bold text-lg mb-2">Payment Successful!</h3>
                <p className="text-muted-foreground text-sm mb-4">Processed successfully.</p>
                <button onClick={reset} className="btn-primary w-full">Create New Payment</button>
              </div>
            )}
            {state.paymentStatus.transaction.status === 'failed' && (
              <div className="glass rounded-2xl p-6 text-center border border-destructive/30">
                <div className="text-4xl mb-2">❌</div>
                <h3 className="text-destructive font-bold text-lg mb-2">Payment Failed</h3>
                <p className="text-muted-foreground text-sm mb-4">Could not be processed.</p>
                <button onClick={reset} className="btn-primary w-full">Try Again</button>
              </div>
            )}
            {state.paymentStatus.transaction.status === 'cancelled' && (
              <div className="glass rounded-2xl p-6 text-center border border-border">
                <div className="text-4xl mb-2">⚠️</div>
                <h3 className="text-foreground font-bold text-lg mb-2">Payment Cancelled</h3>
                <p className="text-muted-foreground text-sm mb-4">Cancelled by the customer.</p>
                <button onClick={reset} className="btn-primary w-full">Create New Payment</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return <AmountInput value={amount} onChange={v => { setAmount(v); if (state.error) clearError(); }} onSubmit={handleSubmit} currency={currency} isLoading={state.isLoading} error={state.error || undefined} autoFocus />;
};
