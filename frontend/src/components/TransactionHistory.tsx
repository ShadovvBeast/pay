import React, { useState, useEffect } from 'react';
import { paymentService } from '../services/payment';

interface TransactionHistoryProps {
  className?: string;
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const formatCurrency = (amount: number, currency: string): string => {
  const currencySymbols: Record<string, string> = {
    'ILS': '₪',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'UGX': 'USh'
  };
  
  const symbol = currencySymbols[currency.toUpperCase()] || currency;
  return `${symbol}${amount.toFixed(2)}`;
};

const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'pending':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'failed':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'cancelled':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getStatusIcon = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'completed':
      return '✅';
    case 'pending':
      return '⏳';
    case 'failed':
      return '❌';
    case 'cancelled':
      return '🚫';
    default:
      return '❓';
  }
};

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ className = '' }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [transactionDetails, setTransactionDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState<string>('');

  const loadTransactions = async (offset = 0, showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const response = await paymentService.getTransactionHistory(pagination.limit, offset);
      
      // Convert string dates to Date objects
      const processedTransactions = response.transactions.map(tx => ({
        ...tx,
        createdAt: new Date(tx.createdAt),
        updatedAt: new Date(tx.updatedAt)
      }));

      if (offset === 0) {
        setTransactions(processedTransactions);
      } else {
        setTransactions(prev => [...prev, ...processedTransactions]);
      }
      
      setPagination(prev => ({
        ...prev,
        offset: offset,
        total: response.pagination.total
      }));
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMore = () => {
    const newOffset = pagination.offset + pagination.limit;
    if (newOffset < pagination.total) {
      loadTransactions(newOffset);
    }
  };

  const refresh = () => {
    loadTransactions(0, true);
  };

  const loadTransactionDetails = async (transactionId: string) => {
    try {
      setDetailsLoading(true);
      setDetailsError('');
      setSelectedTransaction(transactionId);

      const details = await paymentService.getTransactionDetails(transactionId);
      setTransactionDetails(details);
    } catch (err) {
      console.error('Error loading transaction details:', err);
      setDetailsError(err instanceof Error ? err.message : 'Failed to load transaction details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedTransaction(null);
    setTransactionDetails(null);
    setDetailsError('');
  };

  const handleCancelPayment = async (transactionId: string) => {
    if (!confirm('Are you sure you want to cancel this payment?')) {
      return;
    }

    try {
      setActionLoading(transactionId);
      await paymentService.cancelPayment(transactionId);
      
      // Refresh the transaction list
      await loadTransactions(0, true);
      
      // Close details modal if it's open for this transaction
      if (selectedTransaction === transactionId) {
        closeDetails();
      }
    } catch (err) {
      console.error('Error canceling payment:', err);
      alert(err instanceof Error ? err.message : 'Failed to cancel payment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefundPayment = async (transactionId: string, amount?: number) => {
    try {
      setActionLoading(transactionId);
      await paymentService.refundPayment(transactionId, amount);
      
      // Refresh the transaction list
      await loadTransactions(0, true);
      
      // Close modals
      setShowRefundModal(false);
      setRefundAmount('');
      if (selectedTransaction === transactionId) {
        closeDetails();
      }
    } catch (err) {
      console.error('Error processing refund:', err);
      alert(err instanceof Error ? err.message : 'Failed to process refund');
    } finally {
      setActionLoading(null);
    }
  };

  const openRefundModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction.id);
    setRefundAmount(transaction.amount.toString());
    setShowRefundModal(true);
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const hasMore = pagination.offset + transactions.length < pagination.total;

  if (loading && transactions.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between items-center p-4 border border-gray-100 rounded-xl">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="space-y-2 text-right">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                    <div className="h-3 bg-gray-200 rounded w-12"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Failed to Load Transactions
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => loadTransactions()}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Transactions Yet
          </h3>
          <p className="text-gray-600">
            Your payment transactions will appear here once you create your first payment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Transaction History
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {pagination.total} total transaction{pagination.total !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="btn-secondary text-sm"
            >
              {refreshing ? '🔄' : '↻'} Refresh
            </button>
          </div>
        </div>

        {/* Transaction List */}
        <div className="divide-y divide-gray-100">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-lg">
                      {getStatusIcon(transaction.status)}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Payment #{transaction.id.slice(-8)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(transaction.createdAt)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="ml-8 flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(transaction.status)}`}>
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => loadTransactionDetails(transaction.id)}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Details
                      </button>
                      
                      {transaction.status === 'pending' && (
                        <button
                          onClick={() => handleCancelPayment(transaction.id)}
                          disabled={actionLoading === transaction.id}
                          className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                        >
                          {actionLoading === transaction.id ? 'Canceling...' : 'Cancel'}
                        </button>
                      )}
                      
                      {transaction.status === 'completed' && (
                        <button
                          onClick={() => openRefundModal(transaction)}
                          disabled={actionLoading === transaction.id}
                          className="text-xs text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50"
                        >
                          {actionLoading === transaction.id ? 'Processing...' : 'Refund'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </p>
                  {transaction.updatedAt.getTime() !== transaction.createdAt.getTime() && (
                    <p className="text-xs text-gray-500">
                      Updated {formatDate(transaction.updatedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="p-6 border-t border-gray-200 text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="btn-secondary"
            >
              {loading ? 'Loading...' : `Load More (${pagination.total - transactions.length} remaining)`}
            </button>
          </div>
        )}

        {/* Footer */}
        {!hasMore && transactions.length > 0 && (
          <div className="p-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Showing all {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Transaction Details
                </h3>
                <button
                  onClick={closeDetails}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {detailsLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading transaction details...</p>
                </div>
              )}

              {detailsError && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⚠️</div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Failed to Load Details
                  </h4>
                  <p className="text-gray-600 mb-4">{detailsError}</p>
                  <button
                    onClick={() => loadTransactionDetails(selectedTransaction)}
                    className="btn-primary"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {transactionDetails && !detailsLoading && !detailsError && (
                <div className="space-y-6">
                  {/* Basic Transaction Info */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Transaction Information</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Transaction ID:</span>
                        <span className="text-sm text-gray-900 font-mono">{transactionDetails.transaction.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Amount:</span>
                        <span className="text-sm text-gray-900 font-semibold">
                          {formatCurrency(transactionDetails.transaction.amount, transactionDetails.transaction.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Status:</span>
                        <span className={`text-sm font-medium ${getStatusColor(transactionDetails.transaction.status).split(' ')[0]}`}>
                          {transactionDetails.transaction.status.charAt(0).toUpperCase() + transactionDetails.transaction.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Created:</span>
                        <span className="text-sm text-gray-900">
                          {formatDate(transactionDetails.transaction.createdAt)}
                        </span>
                      </div>
                      {transactionDetails.transaction.updatedAt !== transactionDetails.transaction.createdAt && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-500">Updated:</span>
                          <span className="text-sm text-gray-900">
                            {formatDate(transactionDetails.transaction.updatedAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AllPay Details */}
                  {transactionDetails.allPayDetails && (
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Payment Details</h4>
                      {transactionDetails.allPayDetails.error ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-yellow-800 text-sm">{transactionDetails.allPayDetails.error}</p>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                          {transactionDetails.allPayDetails.client_name && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">Customer Name:</span>
                              <span className="text-sm text-gray-900">{transactionDetails.allPayDetails.client_name}</span>
                            </div>
                          )}
                          {transactionDetails.allPayDetails.client_email && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">Customer Email:</span>
                              <span className="text-sm text-gray-900">{transactionDetails.allPayDetails.client_email}</span>
                            </div>
                          )}
                          {transactionDetails.allPayDetails.client_phone && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">Customer Phone:</span>
                              <span className="text-sm text-gray-900">{transactionDetails.allPayDetails.client_phone}</span>
                            </div>
                          )}
                          {transactionDetails.allPayDetails.transaction_id && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">AllPay Transaction ID:</span>
                              <span className="text-sm text-gray-900 font-mono">{transactionDetails.allPayDetails.transaction_id}</span>
                            </div>
                          )}
                          {transactionDetails.allPayDetails.order_id && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">AllPay Order ID:</span>
                              <span className="text-sm text-gray-900 font-mono">{transactionDetails.allPayDetails.order_id}</span>
                            </div>
                          )}
                          {transactionDetails.allPayDetails.status && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">AllPay Status:</span>
                              <span className="text-sm text-gray-900">{transactionDetails.allPayDetails.status}</span>
                            </div>
                          )}
                          {transactionDetails.allPayDetails.amount && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">AllPay Amount:</span>
                              <span className="text-sm text-gray-900">
                                {transactionDetails.allPayDetails.currency} {(transactionDetails.allPayDetails.amount / 100).toFixed(2)}
                              </span>
                            </div>
                          )}

                          {/* Card Information */}
                          {transactionDetails.allPayDetails.card_mask && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">Card Number:</span>
                              <span className="text-sm text-gray-900 font-mono">{transactionDetails.allPayDetails.card_mask}</span>
                            </div>
                          )}
                          {transactionDetails.allPayDetails.card_brand && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">Card Brand:</span>
                              <span className="text-sm text-gray-900 capitalize">{transactionDetails.allPayDetails.card_brand}</span>
                            </div>
                          )}
                          {transactionDetails.allPayDetails.foreign_card !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">Foreign Card:</span>
                              <span className="text-sm text-gray-900">{transactionDetails.allPayDetails.foreign_card ? 'Yes' : 'No'}</span>
                            </div>
                          )}
                          
                          {/* Show any additional fields */}
                          {Object.entries(transactionDetails.allPayDetails).map(([key, value]) => {
                            // Skip fields we've already shown or don't want to show
                            if (['client_name', 'client_email', 'client_phone', 'transaction_id', 'order_id', 'status', 'amount', 'currency', 'card_mask', 'card_brand', 'foreign_card', 'receipt', 'sign', 'error'].includes(key)) {
                              return null;
                            }
                            
                            // Only show non-empty values
                            if (!value || value === '') {
                              return null;
                            }
                            
                            return (
                              <div key={key} className="flex justify-between">
                                <span className="text-sm font-medium text-gray-500 capitalize">
                                  {key.replace(/_/g, ' ')}:
                                </span>
                                <span className="text-sm text-gray-900">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200">
              <div className="flex space-x-3">
                {/* Receipt Button - only show if receipt link exists and is not empty */}
                {transactionDetails?.allPayDetails?.receipt && 
                 transactionDetails.allPayDetails.receipt.trim() !== '' && (
                  <button
                    onClick={() => window.open(transactionDetails.allPayDetails.receipt, '_blank')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <span>📄</span>
                    <span>View Receipt</span>
                  </button>
                )}
                
                <button
                  onClick={closeDetails}
                  className={`${transactionDetails?.allPayDetails?.receipt && transactionDetails.allPayDetails.receipt.trim() !== '' ? 'flex-1' : 'w-full'} btn-secondary`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Process Refund
                </h3>
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setRefundAmount('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Refund Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={refundAmount}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter refund amount"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty or enter full amount for complete refund
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Refunds are processed using available funds in your AllPay account. 
                    If insufficient funds are available, the refund may fail.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex space-x-3">
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setRefundAmount('');
                }}
                className="flex-1 btn-secondary"
                disabled={actionLoading === selectedTransaction}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const amount = refundAmount ? parseFloat(refundAmount) : undefined;
                  handleRefundPayment(selectedTransaction!, amount);
                }}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200 disabled:opacity-50"
                disabled={actionLoading === selectedTransaction || !refundAmount || parseFloat(refundAmount) <= 0}
              >
                {actionLoading === selectedTransaction ? 'Processing...' : 'Process Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};