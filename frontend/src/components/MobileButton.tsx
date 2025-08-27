import React, { useRef, useEffect } from 'react';
import { useMobile } from '../hooks/useMobile';

interface MobileButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  hapticType?: 'success' | 'error' | 'warning';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const MobileButton: React.FC<MobileButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  hapticType = 'success',
  className = '',
  type = 'button',
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { hapticFeedback, addTouchOptimization, features } = useMobile();

  // Apply touch optimization on mount
  useEffect(() => {
    if (buttonRef.current && features.isTouchDevice) {
      addTouchOptimization(buttonRef.current);
    }
  }, [addTouchOptimization, features.isTouchDevice]);

  const handleClick = async () => {
    if (disabled) return;

    // Provide haptic feedback
    if (features.hasHapticFeedback) {
      await hapticFeedback(hapticType);
    }

    onClick();
  };

  const baseClasses = [
    'font-semibold',
    'rounded-lg',
    'transition-all',
    'duration-200',
    'focus:outline-none',
    'focus:ring-4',
    'active:scale-95',
    'select-none',
    // Touch-optimized minimum size
    'min-h-[44px]',
    'min-w-[44px]',
  ];

  const variantClasses = {
    primary: [
      'bg-blue-600',
      'text-white',
      'hover:bg-blue-700',
      'focus:ring-blue-300',
      'disabled:bg-blue-300',
    ],
    secondary: [
      'bg-gray-200',
      'text-gray-900',
      'hover:bg-gray-300',
      'focus:ring-gray-300',
      'disabled:bg-gray-100',
    ],
    success: [
      'bg-green-600',
      'text-white',
      'hover:bg-green-700',
      'focus:ring-green-300',
      'disabled:bg-green-300',
    ],
    danger: [
      'bg-red-600',
      'text-white',
      'hover:bg-red-700',
      'focus:ring-red-300',
      'disabled:bg-red-300',
    ],
  };

  const sizeClasses = {
    sm: ['px-3', 'py-2', 'text-sm'],
    md: ['px-4', 'py-3', 'text-base'],
    lg: ['px-6', 'py-4', 'text-lg'],
  };

  const disabledClasses = disabled
    ? ['cursor-not-allowed', 'opacity-50']
    : ['cursor-pointer'];

  const allClasses = [
    ...baseClasses,
    ...variantClasses[variant],
    ...sizeClasses[size],
    ...disabledClasses,
    className,
  ].join(' ');

  return (
    <button
      ref={buttonRef}
      type={type}
      className={allClasses}
      onClick={handleClick}
      disabled={disabled}
      // Prevent double-tap zoom on iOS
      onTouchStart={() => {}}
    >
      {children}
    </button>
  );
};