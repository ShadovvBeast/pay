import React, { useState, useEffect } from 'react';
import { AmountInput } from './AmountInput';
import { QRCodeDisplay } from './QRCodeDisplay';
import { usePayment } from '../hooks/usePayment';
import { useAuth } from '../hooks/useAuth';

export interface PaymentFlowProps {
  onPaymentComplete?: (transactionId: string) => void;
  onPaymentError?: (error: string) => void;
}

type PaymentStep = 'amount' | 'qr' | 'status';

export const PaymentFlow: React.FC<PaymentFlowProps> = ({
  onPaymentComplete,
  onPaymentError,
}) => {
  const { user } = useAuth();
  const { state, createPayment, clearPayment, clearError } = usePayment();
  const [currentStep, setCurrentStep] = useState<PaymentStep>('amount');
  const [amount, setAmount] = useState('');

  // Default currency from user config or fallback to ILS
  const currency = user?.merchantConfig?.currency || 'ILS';

  // Handle payment status changes
  useEffect(() => {
    if (state.paymentStatus) {
      const status = state.paymentStatus.transaction.status;
      
      if (status === 'completed') {
        onPaymentComplete?.(state.paymentStatus.transaction.id);
      } else if (status === 'failed' || status === 'cancelled') {
        onPaymentError?.(
          status === 'failed' 
            ? 'Payment failed. Please try again.' 
            : 'Payment was cancelled.'
        );
      }
    }
  }, [state.paymentStatus, onPaymentComplete, onPaymentError]);

  // Handle errors
  useEffect(() => {
    if (state.error) {
      onPaymentError?.(state.error);
    }
  }, [state.error, onPaymentError]);

  const handleAmountSubmit = async (amountValue: number) => {
    try {
      await createPayment({
        amount: amountValue,
        description: `Payment from ${user?.shopName || 'SB0 Pay'}`,
      });
      
      setCurrentStep('qr');
    } catch (error) {
      // Error is handled by the usePayment hook
      console.error('Payment creation failed:', error);
    }
  };

  const handleNewPayment = () => {
    clearPayment();
    clearError();
    setAmount('');
    setCurrentStep('amount');
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    // Clear any previous errors when user starts typing
    if (state.error) {
      clearError();
    }
  };

  // Show loading state during payment creation
  if (currentStep === 'qr' && state.isLoading && !state.currentPayment) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Creating Payment
          </h2>
          <p className="text-gray-600 mb-4">
            Please wait while we generate your payment link...
          </p>
          <div className="text-2xl font-bold text-primary-600">
            {currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency}
            {parseFloat(amount || '0').toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>
    );
  }

  // Show QR code when payment is created
  if (currentStep === 'qr' && state.currentPayment) {
    return (
      <div className="space-y-4">
        <QRCodeDisplay
          paymentUrl={state.currentPayment.paymentUrl}
          amount={state.currentPayment.transaction.amount}
          currency={state.currentPayment.transaction.currency}
          onNewPayment={handleNewPayment}
          isLoading={false}
          error={state.error || undefined}
        />
        
        {/* Payment Status Indicator */}
        {state.isPolling && (
          <div className="w-full max-w-md mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-blue-800 font-medium">Waiting for payment...</span>
              </div>
              <p className="text-blue-700 text-sm">
                We'll automatically update when the payment is received
              </p>
            </div>
          </div>
        )}

        {/* Payment Status Updates */}
        {state.paymentStatus && (
          <div className="w-full max-w-md mx-auto">
            {state.paymentStatus.transaction.status === 'completed' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <div className="text-4xl mb-2">✅</div>
                <h3 className="text-green-800 font-bold text-lg mb-2">
                  Payment Successful!
                </h3>
                <p className="text-green-700 text-sm mb-4">
                  The payment has been processed successfully.
                </p>
                <button
                  onClick={handleNewPayment}
                  className="btn-primary w-full"
                >
                  Create New Payment
                </button>
              </div>
            )}

            {state.paymentStatus.transaction.status === 'failed' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <div className="text-4xl mb-2">❌</div>
                <h3 className="text-red-800 font-bold text-lg mb-2">
                  Payment Failed
                </h3>
                <p className="text-red-700 text-sm mb-4">
                  The payment could not be processed. Please try again.
                </p>
                <button
                  onClick={handleNewPayment}
                  className="btn-primary w-full"
                >
                  Try Again
                </button>
              </div>
            )}

            {state.paymentStatus.transaction.status === 'cancelled' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                <div className="text-4xl mb-2">⚠️</div>
                <h3 className="text-yellow-800 font-bold text-lg mb-2">
                  Payment Cancelled
                </h3>
                <p className="text-yellow-700 text-sm mb-4">
                  The payment was cancelled by the customer.
                </p>
                <button
                  onClick={handleNewPayment}
                  className="btn-primary w-full"
                >
                  Create New Payment
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Show amount input (default step)
  return (
    <AmountInput
      value={amount}
      onChange={handleAmountChange}
      onSubmit={handleAmountSubmit}
      currency={currency}
      isLoading={state.isLoading}
      error={state.error || undefined}
      autoFocus={true}
    />
  );
};