import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export const PaymentFailure: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [errorDetails, setErrorDetails] = useState<any>(null);
  
  // Get error details from URL parameters
  const orderId = searchParams.get('order_id');
  const error = searchParams.get('error');
  const errorCode = searchParams.get('error_code');

  useEffect(() => {
    setErrorDetails({
      orderId,
      error,
      errorCode
    });
  }, [orderId, error, errorCode]);

  const getErrorMessage = () => {
    if (error) return error;
    if (errorCode) {
      // Map common error codes to user-friendly messages
      const errorMessages: Record<string, string> = {
        '1': 'Payment was declined by your bank',
        '2': 'Insufficient funds',
        '3': 'Invalid card details',
        '4': 'Card expired',
        '5': 'Transaction timeout',
        '6': 'Payment cancelled by user'
      };
      return errorMessages[errorCode] || `Payment failed (Error code: ${errorCode})`;
    }
    return 'Payment could not be processed';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="card max-w-md w-full mx-4 text-center">
        {/* Error Icon */}
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg 
            className="w-8 h-8 text-red-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Payment Failed
        </h1>
        
        <p className="text-gray-600 mb-6">
          {getErrorMessage()}
        </p>

        {errorDetails?.orderId && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">Transaction Details</h3>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Order ID:</span> {errorDetails.orderId}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            to="/dashboard"
            className="btn btn-primary w-full"
          >
            Try Again
          </Link>
          
          <Link
            to="/dashboard"
            className="btn btn-secondary w-full"
          >
            Return to Dashboard
          </Link>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Need Help?</h4>
          <p className="text-sm text-blue-700">
            If you continue to experience issues, please check your payment details or contact your bank.
          </p>
        </div>
      </div>
    </div>
  );
};