import React, { useRef, useEffect, useState } from 'react';
import { useMobile } from '../hooks/useMobile';

interface MobileInputProps {
  type?: 'text' | 'email' | 'tel' | 'number' | 'password';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  autoFocus?: boolean;
  preventZoom?: boolean;
  className?: string;
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
}

export const MobileInput: React.FC<MobileInputProps> = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
  label,
  autoFocus = false,
  preventZoom = false,
  className = '',
  inputMode,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const { features, preventZoom: preventZoomFn, allowZoom, addTouchOptimization } = useMobile();

  // Apply touch optimization and auto-focus
  useEffect(() => {
    if (inputRef.current) {
      if (features.isTouchDevice) {
        addTouchOptimization(inputRef.current);
      }
      
      if (autoFocus) {
        // Delay auto-focus to ensure proper rendering
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }
  }, [addTouchOptimization, features.isTouchDevice, autoFocus]);

  const handleFocus = () => {
    setIsFocused(true);
    
    // Prevent zoom on iOS when focusing input
    if (preventZoom && features.isTouchDevice) {
      preventZoomFn();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // Restore zoom capability
    if (preventZoom && features.isTouchDevice) {
      allowZoom();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // Determine input mode based on type if not explicitly set
  const getInputMode = (): string | undefined => {
    if (inputMode) return inputMode;
    
    switch (type) {
      case 'tel':
        return 'tel';
      case 'email':
        return 'email';
      case 'number':
        return 'numeric';
      default:
        return 'text';
    }
  };

  const baseClasses = [
    'w-full',
    'px-4',
    'py-3',
    'text-base',
    'border',
    'rounded-lg',
    'transition-all',
    'duration-200',
    'focus:outline-none',
    'focus:ring-2',
    // Touch-optimized minimum height
    'min-h-[44px]',
    // Prevent zoom on iOS
    preventZoom ? 'text-base' : '',
  ];

  const stateClasses = error
    ? [
        'border-red-300',
        'focus:border-red-500',
        'focus:ring-red-200',
      ]
    : [
        'border-gray-300',
        'focus:border-blue-500',
        'focus:ring-blue-200',
      ];

  const disabledClasses = disabled
    ? ['bg-gray-100', 'cursor-not-allowed', 'opacity-50']
    : ['bg-white', 'hover:border-gray-400'];

  const focusClasses = isFocused
    ? ['ring-2', 'scale-[1.02]']
    : [];

  const allClasses = [
    ...baseClasses,
    ...stateClasses,
    ...disabledClasses,
    ...focusClasses,
    className,
  ].join(' ');

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={allClasses}
        inputMode={getInputMode() as any}
        // Prevent autocomplete zoom on iOS
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        // Prevent double-tap zoom
        onTouchStart={() => {}}
      />
      
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};