import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QRCodeDisplayProps } from '../types/payment';

const SYM: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', UGX: 'USh' };

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ paymentUrl, amount, currency, onNewPayment, isLoading = false, error }) => {
  const [qr, setQr] = useState('');
  const [qrErr, setQrErr] = useState('');
  const sym = SYM[currency] || currency;
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    if (!paymentUrl) { setQr(''); return; }
    QRCode.toDataURL(paymentUrl, { width: 300, margin: 2, color: { dark: '#e8f5e9', light: '#0a1a0f' }, errorCorrectionLevel: 'M' })
      .then(setQr).catch(() => { setQrErr('Failed to generate QR code'); setQr(''); });
  }, [paymentUrl]);

  const reset = () => { setQr(''); setQrErr(''); onNewPayment(); };

  if (error) return (
    <div className="w-full max-w-md mx-auto glass rounded-2xl p-8 text-center">
      <div className="text-5xl mb-4">❌</div>
      <h2 className="text-xl font-semibold text-foreground mb-2">Payment Failed</h2>
      <p className="text-muted-foreground mb-6">{error}</p>
      <button onClick={reset} className="btn-primary w-full">Try Again</button>
    </div>
  );

  if (isLoading) return (
    <div className="w-full max-w-md mx-auto glass rounded-2xl p-8 text-center">
      <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
      <h2 className="text-xl font-semibold text-foreground mb-2">Creating Payment</h2>
      <p className="text-muted-foreground">Generating your payment link…</p>
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto glass rounded-2xl p-8 text-center">
      <div className="mb-6">
        <div className="text-4xl font-display text-primary mb-1">{sym}{fmt(amount)}</div>
        <p className="text-muted-foreground text-sm">Payment Amount</p>
      </div>

      <div className="mb-6">
        {qrErr ? (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-6"><p className="text-destructive">⚠️ {qrErr}</p></div>
        ) : qr ? (
          <div className="rounded-xl bg-card p-6">
            <img src={qr} alt="Payment QR Code" className="mx-auto w-64 h-64 max-w-full rounded-lg" style={{ imageRendering: 'pixelated' }} />
            <p className="text-xs text-muted-foreground mt-4">Scan to pay with Credit Card, Bit, or Apple Pay</p>
          </div>
        ) : (
          <div className="rounded-xl bg-card p-6"><div className="w-64 h-64 mx-auto bg-secondary rounded-lg flex items-center justify-center text-muted-foreground">QR Loading…</div></div>
        )}
      </div>

      <div className="mb-6 text-left">
        <h3 className="font-semibold text-foreground mb-3">How to pay:</h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          {['Scan the QR code with your phone camera', 'Choose your payment method', 'Complete the payment securely'].map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-3">
        <button onClick={reset} className="btn-primary w-full">New Payment</button>
        {paymentUrl && <button onClick={() => window.open(paymentUrl, '_blank')} className="btn-secondary w-full">Open Payment Link</button>}
      </div>
    </div>
  );
};
