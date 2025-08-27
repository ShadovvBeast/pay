import React, { useState, useEffect, useRef } from 'react';
import { AmountInputProps } from '../types/payment';

const CURRENCY_SYMBOLS: Record<string, string> = {
  ILS: '₪',
  USD: '$',
  EUR: '€',
};

const CURRENCY_NAMES: Record<string, string> = {
  ILS: 'Israeli Shekel',
  USD: 'US Dollar',
  EUR: 'Euro',
};

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  onSubmit,
  currency,
  isLoading = false,
  error,
  autoFocus = true,
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;
  const currencyName = CURRENCY_NAMES[currency] || currency;

  // Sync with external value changes
  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  // Auto-focus on mount if enabled
  useEffect(() => {
    if (autoFocus && inputRef.current && !isLoading) {
      inputRef.current.focus();
    }
  }, [autoFocus, isLoading]);

  // Format number with currency symbol and proper decimal places
  const formatCurrency = (amount: string): string => {
    if (!amount || amount === '0') return '';
    
    // Remove any non-digit characters except decimal point
    const cleanAmount = amount.replace(/[^\d.]/g, '');
    
    // Parse as float and format with 2 decimal places
    const numericAmount = parseFloat(cleanAmount);
    if (isNaN(numericAmount)) return '';
    
    return numericAmount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  // Validate amount input
  const validateAmount = (amount: string): string | null => {
    if (!amount || amount.trim() === '') {
      return 'Amount is required';
    }

    const numericAmount = parseFloat(amount.replace(/[^\d.]/g, ''));
    
    if (isNaN(numericAmount)) {
      return 'Please enter a valid amount';
    }

    if (numericAmount <= 0) {
      return 'Amount must be greater than 0';
    }

    if (numericAmount > 999999.99) {
      return 'Amount cannot exceed 999,999.99';
    }

    // Check for more than 2 decimal places
    const decimalPart = amount.split('.')[1];
    if (decimalPart && decimalPart.length > 2) {
      return 'Amount cannot have more than 2 decimal places';
    }

    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Remove currency symbol and spaces for processing
    inputValue = inputValue.replace(/[^\d.]/g, '');
    
    // Prevent multiple decimal points
    const decimalCount = (inputValue.match(/\./g) || []).length;
    if (decimalCount > 1) {
      return;
    }

    // Limit to 2 decimal places
    const parts = inputValue.split('.');
    if (parts[1] && parts[1].length > 2) {
      inputValue = `${parts[0]}.${parts[1].substring(0, 2)}`;
    }

    setDisplayValue(inputValue);
    onChange(inputValue);
    setTouched(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateAmount(displayValue);
    if (validationError) {
      return;
    }

    const numericAmount = parseFloat(displayValue.replace(/[^\d.]/g, ''));
    onSubmit(numericAmount);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow Enter to submit
    if (e.key === 'Enter') {
      handleSubmit(e as any);
      return;
    }

    // Allow control keys and navigation
    if (e.key === 'Backspace' || 
        e.key === 'Delete' || 
        e.key === 'Tab' || 
        e.key === 'Escape' || 
        e.key === 'ArrowLeft' || 
        e.key === 'ArrowRight' || 
        e.key === 'Home' || 
        e.key === 'End' ||
        (e.ctrlKey && (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x'))) {
      return;
    }

    // Allow numbers and decimal point
    if (/^[0-9.]$/.test(e.key)) {
      return;
    }

    // Block all other keys
    e.preventDefault();
  };

  const validationError = touched ? validateAmount(displayValue) : null;
  const isValid = !validationError && displayValue.trim() !== '';
  const showError = error || (touched && validationError);

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Currency Display */}
        <div className="text-center mb-4">
          <div className="text-6xl font-bold text-primary-600 mb-2">
            {currencySymbol}
          </div>
          <p className="text-sm text-gray-600">
            {currencyName}
          </p>
        </div>

        {/* Amount Input */}
        <div className="relative">
          <label htmlFor="amount" className="sr-only">
            Payment Amount
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              id="amount"
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              className={`
                w-full text-center text-4xl font-bold py-6 px-4 
                border-2 rounded-2xl focus:outline-none transition-all duration-200
                min-h-[80px] touch-target
                ${isFocused ? 'border-primary-500 ring-4 ring-primary-100' : 'border-gray-300'}
                ${showError ? 'border-error-500 ring-4 ring-error-100' : ''}
                ${isLoading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
              `}
              value={displayValue}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="0.00"
              disabled={isLoading}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            
            {/* Currency Symbol Overlay */}
            {displayValue && (
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-2xl font-bold text-gray-400 pointer-events-none">
                {currencySymbol}
              </div>
            )}
          </div>

          {/* Error Message */}
          {showError && (
            <div className="mt-3 p-3 bg-error-50 border border-error-200 rounded-lg">
              <p className="text-error-700 text-sm font-medium text-center">
                {error || validationError}
              </p>
            </div>
          )}

          {/* Formatted Amount Display */}
          {displayValue && !validationError && !error && (
            <div className="mt-3 text-center">
              <p className="text-lg font-semibold text-gray-700">
                {currencySymbol}{formatCurrency(displayValue)}
              </p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isValid || isLoading}
          className={`
            w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-200
            min-h-[60px] touch-target
            ${isValid && !isLoading
              ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Creating Payment...</span>
            </div>
          ) : (
            'Create Payment'
          )}
        </button>

        {/* Quick Amount Buttons */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[10, 50, 100].map((quickAmount) => (
            <button
              key={quickAmount}
              type="button"
              onClick={() => {
                const amountStr = quickAmount.toString();
                setDisplayValue(amountStr);
                onChange(amountStr);
                setTouched(true);
              }}
              disabled={isLoading}
              className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors duration-200 touch-target"
            >
              {currencySymbol}{quickAmount}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
};