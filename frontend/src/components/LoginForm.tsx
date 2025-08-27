import React, { useState } from 'react';
import { useFormValidation } from '../hooks/useFormValidation';
import { LoginData } from '../types/auth';

interface LoginFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
  onLogin: (email: string, password: string) => Promise<void>;
}

const initialValues: LoginData = {
  email: '',
  password: '',
};

const validationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    required: true,
    minLength: 1,
  },
};

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onError,
  onLogin,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    setIsSubmitting,
    handleChange,
    handleBlur,
    validateForm,
  } = useFormValidation(initialValues, validationRules);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onLogin(values.email, values.password);
      
      // Handle remember me functionality
      if (rememberMe) {
        localStorage.setItem('remember_email', values.email);
      } else {
        localStorage.removeItem('remember_email');
      }
      
      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load remembered email on component mount
  React.useEffect(() => {
    const rememberedEmail = localStorage.getItem('remember_email');
    if (rememberedEmail) {
      handleChange('email', rememberedEmail);
      setRememberMe(true);
    }
  }, [handleChange]);

  return (
    <div className="max-w-md mx-auto">
      <div className="card">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Welcome Back
          </h1>
          <p className="text-center text-gray-600">
            Sign in to your SB0 Pay account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className={`input-field ${errors.email && touched.email ? 'border-error-500' : ''}`}
              value={values.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder="Enter your email address"
              autoComplete="email"
              inputMode="email"
              disabled={isSubmitting}
            />
            {errors.email && touched.email && (
              <p className="error-text">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`input-field pr-12 ${errors.password && touched.password ? 'border-error-500' : ''}`}
                value={values.password}
                onChange={(e) => handleChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 touch-target"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && touched.password && (
              <p className="error-text">{errors.password}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>

            <button
              type="button"
              className="text-sm text-primary-600 hover:text-primary-500 focus:outline-none focus:underline"
              disabled={isSubmitting}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};