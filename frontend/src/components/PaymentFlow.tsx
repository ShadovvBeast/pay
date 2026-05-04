import React, { useState, useEffect } from 'react';
import { AmountInput } from './AmountInput';
import { QRCodeDisplay } from './QRCodeDisplay';
import { MobileMoneyStatus } from './MobileMoneyStatus';
import { usePayment } from '../hooks/usePayment';
import { useAuth } from '../hooks/useAuth';

export interface PaymentFlowProps {
  onPaymentComplete?: (transactionId: string) => void;
  onPaymentError?: (error: string) => void;
}

type Step = 'amount' | 'method' | 'qr' | 'mobile_waiting';
type PaymentMethodChoice = 'card' | 'mobile_money';

export const PaymentFlow: React.FC<PaymentFlowProps> = ({ onPaymentComplete, onPaymentError }) => {
  const { user } = useAuth();
  const { state, createPayment, clearPayment, clearError } = usePayment();
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState('');
  const [paymentMethodChoice, setPaymentMethodChoice] = useState<PaymentMethodChoice>('card');
  const [customerPhone, setCustomerPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const currency = user?.merchantConfig?.currency || 'ILS';
  const SYM: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', UGX: 'USh', KES: 'KSh', GHS: 'GH₵', TZS: 'TSh', NGN: '₦', ZAR: 'R', RWF: 'RF' };

  useEffect(() => {
    if (state.paymentStatus) {
      const s = state.paymentStatus.transaction.status;
      if (s === 'completed') onPaymentComplete?.(state.paymentStatus.transaction.id);
      else if (s === 'failed' || s === 'cancelled') onPaymentError?.(s === 'failed' ? 'Payment failed.' : 'Payment cancelled.');
    }
  }, [state.paymentStatus, onPaymentComplete, onPaymentError]);

  useEffect(() => { if (state.error) onPaymentError?.(state.error); }, [state.error, onPaymentError]);

  const handleAmountSubmit = async (_v: number) => {
    setStep('method');
  };

  const handleMethodSelect = async (method: PaymentMethodChoice) => {
    setPaymentMethodChoice(method);

    if (method === 'card') {
      // Go straight to AllPay card flow
      try {
        await createPayment({
          amount: parseFloat(amount),
          description: `Payment from ${user?.shopName || 'SB0 Pay'}`,
          paymentMethod: 'card',
        });
        setStep('qr');
      } catch {}
    }
    // For mobile_money, we stay on 'method' step to collect phone number
  };

  const handleMobileMoneySubmit = async () => {
    if (!customerPhone || customerPhone.replace(/\D/g, '').length < 7) {
      setPhoneError('Please enter a valid phone number with country code');
      return;
    }
    setPhoneError('');

    try {
      await createPayment({
        amount: parseFloat(amount),
        description: `Payment from ${user?.shopName || 'SB0 Pay'}`,
        paymentMethod: 'mobile_money',
        customerPhone,
      });
      setStep('mobile_waiting');
    } catch {}
  };

  const reset = () => {
    clearPayment();
    clearError();
    setAmount('');
    setCustomerPhone('');
    setPhoneError('');
    setPaymentMethodChoice('card');
    setStep('amount');
  };

  // ── Loading state ──────────────────────────────────────────────────────
  if ((step === 'qr' || step === 'mobile_waiting') && state.isLoading && !state.currentPayment) {
    return (
      <div className="w-full max-w-md mx-auto glass rounded-2xl p-8 text-center">
        <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Creating Payment</h2>
        <p className="text-muted-foreground mb-4">
          {paymentMethodChoice === 'mobile_money'
            ? 'Sending payment request to customer\'s phone…'
            : 'Generating your payment link…'}
        </p>
        <div className="text-2xl font-display text-primary">{SYM[currency] || currency}{parseFloat(amount || '0').toFixed(2)}</div>
      </div>
    );
  }

  // ── Mobile Money waiting state ─────────────────────────────────────────
  if (step === 'mobile_waiting' && state.currentPayment) {
    const provider = (state.currentPayment.transaction as any).paymentProvider;

    return (
      <div className="space-y-4">
        <MobileMoneyStatus
          provider={provider || 'mobile_money'}
          customerPhone={customerPhone}
          amount={state.currentPayment.transaction.amount}
          currency={state.currentPayment.transaction.currency}
          status={state.paymentStatus?.transaction.status || 'pending'}
          isPolling={state.isPolling}
          onNewPayment={reset}
        />
        {state.paymentStatus && renderStatusResult(state.paymentStatus.transaction.status, reset)}
      </div>
    );
  }

  // ── QR Code display (AllPay card flow) ─────────────────────────────────
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
        {state.paymentStatus && renderStatusResult(state.paymentStatus.transaction.status, reset)}
      </div>
    );
  }

  // ── Payment method selection ───────────────────────────────────────────
  if (step === 'method') {
    return (
      <div className="w-full max-w-md mx-auto space-y-4">
        <div className="glass rounded-2xl p-6">
          <div className="text-center mb-6">
            <div className="text-3xl font-display text-primary mb-1">
              {SYM[currency] || currency}{parseFloat(amount || '0').toFixed(2)}
            </div>
            <p className="text-muted-foreground text-sm">Choose payment method</p>
          </div>

          <div className="space-y-3">
            {/* Card / QR Payment */}
            <button
              onClick={() => handleMethodSelect('card')}
              disabled={state.isLoading}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
            >
              <div className="text-3xl">💳</div>
              <div>
                <div className="font-semibold text-foreground">Card / QR Code</div>
                <div className="text-sm text-muted-foreground">Pay via AllPay — card, Apple Pay, Bit</div>
              </div>
            </button>

            {/* Mobile Money */}
            <button
              onClick={() => setPaymentMethodChoice('mobile_money')}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                paymentMethodChoice === 'mobile_money'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <div className="text-3xl">📱</div>
              <div>
                <div className="font-semibold text-foreground">Mobile Money</div>
                <div className="text-sm text-muted-foreground">MTN MoMo, Airtel Money, M-Pesa</div>
              </div>
            </button>
          </div>

          {/* Phone number input for mobile money */}
          {paymentMethodChoice === 'mobile_money' && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Customer Phone Number
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => { setCustomerPhone(e.target.value); setPhoneError(''); }}
                  placeholder="+256 771 234 567"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg"
                  autoFocus
                />
                {phoneError && (
                  <p className="text-destructive text-sm mt-1">{phoneError}</p>
                )}
                <p className="text-muted-foreground text-xs mt-1">
                  Include country code. Auto-detects provider (MTN, Airtel, M-Pesa).
                </p>
              </div>
              <button
                onClick={handleMobileMoneySubmit}
                disabled={state.isLoading || !customerPhone}
                className="btn-primary w-full py-3 text-lg"
              >
                {state.isLoading ? 'Sending…' : 'Send Payment Request'}
              </button>
            </div>
          )}

          <button
            onClick={() => { setStep('amount'); setPaymentMethodChoice('card'); }}
            className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Change amount
          </button>
        </div>
      </div>
    );
  }

  // ── Amount input (default step) ────────────────────────────────────────
  return <AmountInput value={amount} onChange={v => { setAmount(v); if (state.error) clearError(); }} onSubmit={handleAmountSubmit} currency={currency} isLoading={state.isLoading} error={state.error || undefined} autoFocus />;
};

// ── Shared status result renderer ──────────────────────────────────────────
function renderStatusResult(status: string, reset: () => void) {
  if (status === 'completed') {
    return (
      <div className="w-full max-w-md mx-auto glass rounded-2xl p-6 text-center border border-primary/30">
        <div className="text-4xl mb-2">✅</div>
        <h3 className="text-primary font-bold text-lg mb-2">Payment Successful!</h3>
        <p className="text-muted-foreground text-sm mb-4">Processed successfully.</p>
        <button onClick={reset} className="btn-primary w-full">Create New Payment</button>
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div className="w-full max-w-md mx-auto glass rounded-2xl p-6 text-center border border-destructive/30">
        <div className="text-4xl mb-2">❌</div>
        <h3 className="text-destructive font-bold text-lg mb-2">Payment Failed</h3>
        <p className="text-muted-foreground text-sm mb-4">Could not be processed.</p>
        <button onClick={reset} className="btn-primary w-full">Try Again</button>
      </div>
    );
  }
  if (status === 'cancelled') {
    return (
      <div className="w-full max-w-md mx-auto glass rounded-2xl p-6 text-center border border-border">
        <div className="text-4xl mb-2">⚠️</div>
        <h3 className="text-foreground font-bold text-lg mb-2">Payment Cancelled</h3>
        <p className="text-muted-foreground text-sm mb-4">Cancelled by the customer.</p>
        <button onClick={reset} className="btn-primary w-full">Create New Payment</button>
      </div>
    );
  }
  return null;
}
