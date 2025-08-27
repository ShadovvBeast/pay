import React, { useState } from 'react';
import { LoginForm } from '../components/LoginForm';
import { RegistrationForm } from '../components/RegistrationForm';
import { useAuth } from '../hooks/useAuth';
import { PWAStatus } from '../components/PWAStatus';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const { login } = useAuth();

  const handleLoginSuccess = () => {
    setError('');
    setSuccess('Welcome back! Redirecting...');
    // In a real app, you would redirect to the dashboard
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1500);
  };

  const handleRegistrationSuccess = () => {
    setError('');
    setSuccess('Account created successfully! Redirecting...');
    // In a real app, you would redirect to the dashboard
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 2000);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setSuccess('');
  };

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
  };



  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* PWA Status at top */}
      <div className="w-full max-w-md mb-4">
        <PWAStatus className="text-xs text-center" />
      </div>

      <div className="max-w-md w-full space-y-8">
        {error && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-error-600">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-error-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-success-50 border border-success-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-success-600">✅</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-success-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {mode === 'login' ? (
          <LoginForm
            onSuccess={handleLoginSuccess}
            onError={handleError}
            onLogin={handleLogin}
          />
        ) : (
          <RegistrationForm
            onSuccess={handleRegistrationSuccess}
            onError={handleError}
          />
        )}

        <div className="text-center">
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
              setSuccess('');
            }}
            className="text-sm text-primary-600 hover:text-primary-500 focus:outline-none focus:underline"
          >
            {mode === 'login' 
              ? "Don't have an account? Create one" 
              : 'Already have an account? Sign in'
            }
          </button>
        </div>

        {/* PWA Install Prompt */}
        <div className="mt-6">
          <PWAInstallPrompt />
        </div>
      </div>
    </div>
  );
};