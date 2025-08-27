import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  
  // Get payment details from URL parameters
  const orderId = searchParams.get('order_id');
  const transactionId = searchParams.get('transaction_id');
  const amount = searchParams.get('amount');
  const currency = searchParams.get('currency');

  useEffect(() => {
    // You could fetch additional payment details here if needed
    if (orderId || transactionId) {
      setPaymentDetails({
        orderId,
        transactionId,
        amount,
        currency
      });
    }
  }, [orderId, transactionId, amount, currency]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="card max-w-md w-full mx-4 text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg 
            className="w-8 h-8 text-green-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Payment Successful!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Your payment has been processed successfully. Thank you for your purchase!
        </p>

        {paymentDetails && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">Payment Details</h3>
            {paymentDetails.orderId && (
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Order ID:</span> {paymentDetails.orderId}
              </p>
            )}
            {paymentDetails.transactionId && (
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Transaction ID:</span> {paymentDetails.transactionId}
              </p>
            )}
            {paymentDetails.amount && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Amount:</span> {paymentDetails.amount} {paymentDetails.currency || 'ILS'}
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <Link
            to="/dashboard"
            className="btn btn-primary w-full"
          >
            Return to Dashboard
          </Link>
          
          <button
            onClick={() => window.print()}
            className="btn btn-secondary w-full"
          >
            Print Receipt
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          If you have any questions about this payment, please contact support.
        </p>
      </div>
    </div>
  );
};