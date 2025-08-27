import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface ValidationErrors {
  [key: string]: string;
}

export interface FormState<T> {
  values: T;
  errors: ValidationErrors;
  touched: { [key: string]: boolean };
  isValid: boolean;
  isSubmitting: boolean;
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: ValidationRules
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback((name: string, value: string): string => {
    const rules = validationRules[name];
    if (!rules) return '';

    if (rules.required && (!value || value.trim() === '')) {
      return 'This field is required';
    }

    if (value && rules.minLength && value.length < rules.minLength) {
      return `Must be at least ${rules.minLength} characters`;
    }

    if (value && rules.maxLength && value.length > rules.maxLength) {
      return `Must be no more than ${rules.maxLength} characters`;
    }

    if (value && rules.pattern && !rules.pattern.test(value)) {
      return 'Invalid format';
    }

    if (value && rules.custom) {
      const customError = rules.custom(value);
      if (customError) return customError;
    }

    return '';
  }, [validationRules]);

  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(name => {
      const error = validateField(name, values[name] || '');
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validateField, validationRules]);

  const handleChange = useCallback((name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Real-time validation for touched fields
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [touched, validateField]);

  const handleBlur = useCallback((name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, values[name] || '');
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [values, validateField]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Calculate isValid by checking all fields against validation rules
  const isValid = Object.keys(validationRules).every(key => {
    const error = validateField(key, values[key] || '');
    return !error;
  });

  return {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    setIsSubmitting,
    handleChange,
    handleBlur,
    validateForm,
    reset,
  };
}