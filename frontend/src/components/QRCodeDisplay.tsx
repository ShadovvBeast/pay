import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QRCodeDisplayProps } from '../types/payment';

const CURRENCY_SYMBOLS: Record<string, string> = {
  ILS: '₪',
  USD: '$',
  EUR: '€',
  UGX: 'USh',
};

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  paymentUrl,
  amount,
  currency,
  onNewPayment,
  isLoading = false,
  error,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrError, setQrError] = useState<string>('');

  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  // Generate QR code when paymentUrl changes
  useEffect(() => {
    const generateQRCode = async () => {
      if (!paymentUrl) {
        setQrCodeDataUrl('');
        return;
      }

      try {
        setQrError('');
        const qrDataUrl = await QRCode.toDataURL(paymentUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#1f2937', // gray-800
            light: '#ffffff', // white
          },
          errorCorrectionLevel: 'M',
        });
        setQrCodeDataUrl(qrDataUrl);
      } catch (err) {
        console.error('Failed to generate QR code:', err);
        setQrError('Failed to generate QR code');
        setQrCodeDataUrl('');
      }
    };

    generateQRCode();
  }, [paymentUrl]);

  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleNewPayment = () => {
    setQrCodeDataUrl('');
    setQrError('');
    onNewPayment();
  };

  if (error) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-error-50 border border-error-200 rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-error-800 mb-4">
            Payment Failed
          </h2>
          <p className="text-error-700 mb-6">
            {error}
          </p>
          <button
            onClick={handleNewPayment}
            className="btn-primary w-full"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Creating Payment
          </h2>
          <p className="text-gray-600">
            Please wait while we generate your payment link...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
        {/* Payment Amount Display */}
        <div className="mb-6">
          <div className="text-4xl font-bold text-primary-600 mb-2">
            {currencySymbol}{formatAmount(amount)}
          </div>
          <p className="text-gray-600">
            Payment Amount
          </p>
        </div>

        {/* QR Code Display */}
        <div className="mb-6">
          {qrError ? (
            <div className="bg-error-50 border border-error-200 rounded-xl p-6">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-error-700 font-medium">
                {qrError}
              </p>
            </div>
          ) : qrCodeDataUrl ? (
            <div className="bg-gray-50 rounded-xl p-6">
              <img
                src={qrCodeDataUrl}
                alt="Payment QR Code"
                className="mx-auto w-64 h-64 max-w-full"
                style={{ imageRendering: 'pixelated' }}
              />
              <p className="text-sm text-gray-600 mt-4">
                Scan to pay with Credit Card, Bit, or Apple Pay
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="w-64 h-64 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-gray-400 text-center">
                  <div className="text-4xl mb-2">📱</div>
                  <p>QR Code Loading...</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mb-6 text-left">
          <h3 className="font-semibold text-gray-900 mb-3">
            How to pay:
          </h3>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="bg-primary-100 text-primary-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                1
              </span>
              Scan the QR code with your phone camera
            </li>
            <li className="flex items-start">
              <span className="bg-primary-100 text-primary-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                2
              </span>
              Choose your payment method: Credit Card, Bit, or Apple Pay
            </li>
            <li className="flex items-start">
              <span className="bg-primary-100 text-primary-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                3
              </span>
              Complete the payment securely
            </li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleNewPayment}
            className="btn-primary w-full"
          >
            New Payment
          </button>
          
          {paymentUrl && (
            <button
              onClick={() => window.open(paymentUrl, '_blank')}
              className="btn-secondary w-full"
            >
              Open Payment Link
            </button>
          )}
        </div>

        {/* Payment URL for debugging (only in development) */}
        {process.env.NODE_ENV === 'development' && paymentUrl && (
          <div className="mt-6 p-3 bg-gray-100 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Payment URL (dev only):</p>
            <p className="text-xs text-gray-800 break-all font-mono">
              {paymentUrl}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};