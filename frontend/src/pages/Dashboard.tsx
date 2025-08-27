import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { PaymentFlow } from '../components/PaymentFlow';
import { PWAStatus } from '../components/PWAStatus';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';
import { TransactionHistory } from '../components/TransactionHistory';
import { Settings } from '../components/Settings';

type DashboardView = 'overview' | 'payment' | 'transactions' | 'settings';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handlePaymentComplete = (transactionId: string) => {
    setSuccessMessage(`Payment completed successfully! Transaction ID: ${transactionId}`);
    // Auto-hide success message after 5 seconds
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handlePaymentError = (error: string) => {
    setErrorMessage(error);
    // Auto-hide error message after 5 seconds
    setTimeout(() => setErrorMessage(''), 5000);
  };

  const clearMessages = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <img
                  src="/favicon-32x32.png"
                  alt="SB0 Pay logo"
                  className="h-7 w-7 rounded-lg"
                />
                <h1 className="text-xl font-semibold text-gray-900">
                  SB0 Pay
                </h1>
              </div>
              {currentView !== 'overview' && (
                <button
                  onClick={() => {
                    setCurrentView('overview');
                    clearMessages();
                  }}
                  className="ml-4 text-primary-600 hover:text-primary-700 font-medium"
                >
                  ← Back to Dashboard
                </button>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700 hidden sm:block">
                {user?.shopName}
              </span>
              <PWAStatus className="hidden sm:block" />
              <button
                onClick={logout}
                className="btn-secondary"
              >
                Sign Out
              </button>
            </div>
          </div>
          {/* Mobile PWA Status */}
          <div className="sm:hidden px-4 pb-3">
            <PWAStatus className="text-xs" />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-6 max-w-md mx-auto">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">✅</div>
                <p className="text-green-800 font-medium">{successMessage}</p>
                <button
                  onClick={() => setSuccessMessage('')}
                  className="mt-2 text-green-600 hover:text-green-700 text-sm underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 max-w-md mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">❌</div>
                <p className="text-red-800 font-medium">{errorMessage}</p>
                <button
                  onClick={() => setErrorMessage('')}
                  className="mt-2 text-red-600 hover:text-red-700 text-sm underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Payment View */}
          {currentView === 'payment' && (
            <div className="max-w-md mx-auto">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Create Payment
                </h2>
                <p className="text-gray-600">
                  Enter the amount to generate a payment QR code
                </p>
              </div>

              <PaymentFlow
                onPaymentComplete={handlePaymentComplete}
                onPaymentError={handlePaymentError}
              />
            </div>
          )}

          {/* Overview/Dashboard View */}
          {currentView === 'overview' && (
            <>
              {/* Quick Payment Button - Mobile First */}
              <div className="mb-8 max-w-md mx-auto">
                <button
                  onClick={() => setCurrentView('payment')}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-6 px-8 rounded-2xl text-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                >
                  💳 Create Payment
                </button>
              </div>

              {/* PWA Install Prompt */}
              <div className="mb-8 max-w-md mx-auto">
                <PWAInstallPrompt />
              </div>

              {/* Dashboard Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="card">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Shop Information
                  </h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Shop Name</dt>
                      <dd className="text-sm text-gray-900">{user?.shopName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Owner</dt>
                      <dd className="text-sm text-gray-900">{user?.ownerName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="text-sm text-gray-900">{user?.email}</dd>
                    </div>
                  </dl>
                </div>

                <div className="card">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Business Configuration
                  </h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Company Number (ח"פ)</dt>
                      <dd className="text-sm text-gray-900">{user?.merchantConfig.companyNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Currency</dt>
                      <dd className="text-sm text-gray-900">
                        {user?.merchantConfig.currency === 'ILS' ? 'Israeli Shekel (₪)' :
                          user?.merchantConfig.currency === 'USD' ? 'US Dollar ($)' :
                            user?.merchantConfig.currency === 'EUR' ? 'Euro (€)' :
                              user?.merchantConfig.currency}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Language</dt>
                      <dd className="text-sm text-gray-900">
                        {user?.merchantConfig.language === 'he' ? 'עברית (Hebrew)' :
                          user?.merchantConfig.language === 'en' ? 'English' :
                            user?.merchantConfig.language === 'ru' ? 'Русский (Russian)' :
                              user?.merchantConfig.language === 'ar' ? 'العربية (Arabic)' :
                                user?.merchantConfig.language}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="card">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setCurrentView('payment')}
                      className="btn-primary w-full"
                    >
                      Create Payment
                    </button>
                    <button
                      onClick={() => setCurrentView('transactions')}
                      className="btn-secondary w-full"
                    >
                      View Transactions
                    </button>
                    <button
                      onClick={() => setCurrentView('settings')}
                      className="btn-secondary w-full"
                    >
                      Settings
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Transactions View */}
          {currentView === 'transactions' && (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Transaction History
                </h2>
                <p className="text-gray-600">
                  View your recent payment transactions
                </p>
              </div>

              <TransactionHistory />
            </div>
          )}

          {/* Settings View */}
          {currentView === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
};