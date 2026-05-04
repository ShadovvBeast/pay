import React from 'react';

interface MobileMoneyStatusProps {
  provider: string;
  customerPhone: string;
  amount: number;
  currency: string;
  status: string;
  isPolling: boolean;
  onNewPayment: () => void;
}

const PROVIDER_INFO: Record<string, { name: string; icon: string; color: string }> = {
  mtn_momo: { name: 'MTN Mobile Money', icon: '🟡', color: 'text-yellow-500' },
  airtel_money: { name: 'Airtel Money', icon: '🔴', color: 'text-red-500' },
  mpesa: { name: 'M-Pesa', icon: '🟢', color: 'text-green-500' },
  mobile_money: { name: 'Mobile Money', icon: '📱', color: 'text-blue-500' },
};

const SYM: Record<string, string> = {
  ILS: '₪', USD: '$', EUR: '€', UGX: 'USh', KES: 'KSh', GHS: 'GH₵',
  TZS: 'TSh', NGN: '₦', ZAR: 'R', RWF: 'RF', XAF: 'FCFA', XOF: 'CFA',
  CDF: 'FC', MZN: 'MT', EGP: 'E£', ETB: 'Br', INR: '₹', MWK: 'MK',
  ZMW: 'ZK', GNF: 'FG', LRD: 'L$', SSP: 'SSP', SZL: 'E', AFN: '؋',
  MGA: 'Ar', SCR: '₨', LKR: 'Rs', LSL: 'L',
};

export const MobileMoneyStatus: React.FC<MobileMoneyStatusProps> = ({
  provider,
  customerPhone,
  amount,
  currency,
  status,
  isPolling,
  onNewPayment,
}) => {
  const info = PROVIDER_INFO[provider] || PROVIDER_INFO.mobile_money;
  const sym = SYM[currency] || currency;

  const maskPhone = (phone: string) => {
    if (phone.length <= 6) return phone;
    return phone.slice(0, 4) + '****' + phone.slice(-3);
  };

  return (
    <div className="w-full max-w-md mx-auto glass rounded-2xl p-6 text-center">
      {/* Provider badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 mb-4">
        <span className="text-lg">{info.icon}</span>
        <span className={`text-sm font-medium ${info.color}`}>{info.name}</span>
      </div>

      {/* Amount */}
      <div className="text-3xl font-display text-primary mb-2">
        {sym}{amount.toFixed(2)}
      </div>

      {/* Phone */}
      <p className="text-muted-foreground text-sm mb-6">
        Sent to <span className="font-mono font-medium text-foreground">{maskPhone(customerPhone)}</span>
      </p>

      {/* Status indicator */}
      {status === 'pending' && (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <h3 className="text-foreground font-semibold text-lg">Waiting for Confirmation</h3>
          <p className="text-muted-foreground text-sm">
            The customer should see a payment prompt on their phone.
            <br />
            They need to enter their PIN to confirm.
          </p>
          {isPolling && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 bg-primary rounded-full animate-pulse" />
              Checking status automatically…
            </div>
          )}
        </div>
      )}

      {status === 'completed' && (
        <div className="space-y-3">
          <div className="text-5xl">✅</div>
          <h3 className="text-primary font-bold text-lg">Payment Received!</h3>
          <p className="text-muted-foreground text-sm">
            {info.name} payment confirmed successfully.
          </p>
          <button onClick={onNewPayment} className="btn-primary w-full mt-4">
            Create New Payment
          </button>
        </div>
      )}

      {status === 'failed' && (
        <div className="space-y-3">
          <div className="text-5xl">❌</div>
          <h3 className="text-destructive font-bold text-lg">Payment Failed</h3>
          <p className="text-muted-foreground text-sm">
            The mobile money transaction could not be completed.
            <br />
            The customer may have insufficient funds or declined the request.
          </p>
          <button onClick={onNewPayment} className="btn-primary w-full mt-4">
            Try Again
          </button>
        </div>
      )}

      {status === 'cancelled' && (
        <div className="space-y-3">
          <div className="text-5xl">⚠️</div>
          <h3 className="text-foreground font-bold text-lg">Payment Cancelled</h3>
          <p className="text-muted-foreground text-sm">
            The customer declined the payment request.
          </p>
          <button onClick={onNewPayment} className="btn-primary w-full mt-4">
            Create New Payment
          </button>
        </div>
      )}

      {/* Back button when pending */}
      {status === 'pending' && (
        <button
          onClick={onNewPayment}
          className="w-full mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel & start over
        </button>
      )}
    </div>
  );
};
