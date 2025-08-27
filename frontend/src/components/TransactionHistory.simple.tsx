import React from 'react';

export const SimpleTransactionHistory: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
      <div className="text-4xl mb-4">📋</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Transaction History (Simple Test)
      </h3>
      <p className="text-gray-600">
        This is a simple test component to verify the transactions view is working.
      </p>
    </div>
  );
};