import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { PaymentSuccess } from './pages/PaymentSuccess';
import { PaymentFailure } from './pages/PaymentFailure';
import { ProtectedRoute } from './components/ProtectedRoute';
import './App.css';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="card max-w-md w-full mx-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/auth" 
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />} 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute fallback={<Navigate to="/auth" replace />}>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/payment/success" 
        element={<PaymentSuccess />} 
      />
      <Route 
        path="/payment/failure" 
        element={<PaymentFailure />} 
      />
      <Route 
        path="/" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/auth"} replace />} 
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
