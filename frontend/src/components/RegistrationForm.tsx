import React, { useState } from 'react';
import { useFormValidation } from '../hooks/useFormValidation';
import { useAuth } from '../hooks/useAuth';
import type { RegisterData } from '../types/auth';

interface RegistrationFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

// Flatten the form values for easier handling
interface FlatFormValues {
  email: string;
  password: string;
  confirmPassword: string;
  shopName: string;
  ownerName: string;
  companyNumber: string;
  currency: string;
  language: string;
}

const initialValues: FlatFormValues = {
  email: '',
  password: '',
  confirmPassword: '',
  shopName: '',
  ownerName: '',
  companyNumber: '',
  currency: 'ILS',
  language: 'he',
};

const validationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    required: true,
    minLength: 8,
    custom: (value: string) => {
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
        return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
      }
      return null;
    },
  },
  confirmPassword: {
    required: true,
    custom: (_value: string) => null, // Will be validated separately
  },
  shopName: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  ownerName: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  companyNumber: {
    required: true,
    minLength: 9,
    maxLength: 9,
    pattern: /^\d{9}$/,
    custom: (value: string) => {
      if (!/^\d{9}$/.test(value)) {
        return 'Company number must be exactly 9 digits';
      }
      return null;
    },
  },
};

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  onSuccess,
  onError,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    values,
    errors,
    touched,
    isSubmitting,
    setIsSubmitting,
    handleChange,
    handleBlur,
    validateForm,
  } = useFormValidation(initialValues, validationRules);

  // Custom validation for confirm password
  const confirmPasswordError = 
    touched.confirmPassword && values.confirmPassword !== values.password
      ? 'Passwords do not match'
      : '';

  // Custom validation for form completion
  const isFormValid = () => {
    // Check if all required fields are filled
    const requiredFields = ['email', 'password', 'confirmPassword', 'shopName', 'ownerName', 'companyNumber'];
    const allFieldsFilled = requiredFields.every(field => values[field as keyof FlatFormValues] && values[field as keyof FlatFormValues].trim() !== '');
    
    // Check if there are no validation errors
    const noErrors = Object.keys(errors).length === 0 || Object.values(errors).every(error => !error);
    
    // Check confirm password
    const passwordsMatch = !confirmPasswordError;
    
    return allFieldsFilled && noErrors && passwordsMatch;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || confirmPasswordError) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Reconstruct the RegisterData structure
      const registerData: RegisterData = {
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
        shopName: values.shopName,
        ownerName: values.ownerName,
        merchantConfig: {
          companyNumber: values.companyNumber,
          currency: values.currency,
          language: values.language,
        },
      };

      await register(registerData);
      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedToStep2 = () => {
    const step1Fields = ['email', 'password', 'confirmPassword', 'shopName', 'ownerName'];
    return step1Fields.every(field => 
      !errors[field] && values[field as keyof FlatFormValues] && 
      (field !== 'confirmPassword' || !confirmPasswordError)
    );
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Business Information</h2>
      
      <div>
        <label htmlFor="shopName" className="block text-sm font-medium text-gray-700 mb-1">
          Business Name *
        </label>
        <input
          id="shopName"
          type="text"
          className={`input-field ${errors.shopName && touched.shopName ? 'border-error-500' : ''}`}
          value={values.shopName}
          onChange={(e) => handleChange('shopName', e.target.value)}
          onBlur={() => handleBlur('shopName')}
          placeholder="Enter your business name"
          autoComplete="organization"
        />
        {errors.shopName && touched.shopName && (
          <p className="error-text">{errors.shopName}</p>
        )}
      </div>

      <div>
        <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 mb-1">
          Contact Person *
        </label>
        <input
          id="ownerName"
          type="text"
          className={`input-field ${errors.ownerName && touched.ownerName ? 'border-error-500' : ''}`}
          value={values.ownerName}
          onChange={(e) => handleChange('ownerName', e.target.value)}
          onBlur={() => handleBlur('ownerName')}
          placeholder="Enter contact person's full name"
          autoComplete="name"
        />
        {errors.ownerName && touched.ownerName && (
          <p className="error-text">{errors.ownerName}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email Address *
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
        />
        {errors.email && touched.email && (
          <p className="error-text">{errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password *
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            className={`input-field pr-12 ${errors.password && touched.password ? 'border-error-500' : ''}`}
            value={values.password}
            onChange={(e) => handleChange('password', e.target.value)}
            onBlur={() => handleBlur('password')}
            placeholder="Create a strong password"
            autoComplete="new-password"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 touch-target"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
        {errors.password && touched.password && (
          <p className="error-text">{errors.password}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Confirm Password *
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            className={`input-field pr-12 ${(confirmPasswordError || (errors.confirmPassword && touched.confirmPassword)) ? 'border-error-500' : ''}`}
            value={values.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            onBlur={() => handleBlur('confirmPassword')}
            placeholder="Confirm your password"
            autoComplete="new-password"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 touch-target"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? '🙈' : '👁️'}
          </button>
        </div>
        {confirmPasswordError && (
          <p className="error-text">{confirmPasswordError}</p>
        )}
        {errors.confirmPassword && touched.confirmPassword && !confirmPasswordError && (
          <p className="error-text">{errors.confirmPassword}</p>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Business Details</h2>
      
      <div>
        <label htmlFor="companyNumber" className="block text-sm font-medium text-gray-700 mb-1">
          Company Registration Number (ח"פ) *
        </label>
        <input
          id="companyNumber"
          type="text"
          className={`input-field ${errors.companyNumber && touched.companyNumber ? 'border-error-500' : ''}`}
          value={values.companyNumber}
          onChange={(e) => handleChange('companyNumber', e.target.value)}
          onBlur={() => handleBlur('companyNumber')}
          placeholder="123456789"
          autoComplete="off"
          inputMode="numeric"
          maxLength={9}
        />
        {errors.companyNumber && touched.companyNumber && (
          <p className="error-text">{errors.companyNumber}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Enter your 9-digit company registration number
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Currency
          </label>
          <select
            id="currency"
            className="input-field"
            value={values.currency}
            onChange={(e) => handleChange('currency', e.target.value)}
          >
            <option value="ILS">Israeli Shekel (₪)</option>
            <option value="USD">US Dollar ($)</option>
            <option value="EUR">Euro (€)</option>
          </select>
        </div>

        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
            Language
          </label>
          <select
            id="language"
            className="input-field"
            value={values.language}
            onChange={(e) => handleChange('language', e.target.value)}
          >
            <option value="he">עברית (Hebrew)</option>
            <option value="en">English</option>
            <option value="ru">Русский (Russian)</option>
            <option value="ar">العربية (Arabic)</option>
          </select>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">ℹ️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              What happens next?
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              We'll handle all the technical setup for you. Once your account is created, 
              you can start accepting payments immediately through our secure payment system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto">
      <div className="card">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Join SB0 Pay
          </h1>
          <p className="text-center text-gray-600 text-sm mb-4">
            Start accepting payments in minutes
          </p>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <div className={`w-8 h-1 ${currentStep >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
          </div>
          <p className="text-center text-gray-600 text-sm">
            Step {currentStep} of 2
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {currentStep === 1 ? renderStep1() : renderStep2()}

          <div className="flex space-x-3">
            {currentStep === 2 && (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="btn-secondary flex-1"
                disabled={isSubmitting}
              >
                Back
              </button>
            )}
            
            {currentStep === 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="btn-primary flex-1"
                disabled={!canProceedToStep2()}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={!isFormValid() || isSubmitting}
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};