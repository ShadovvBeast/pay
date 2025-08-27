import type { User, MerchantConfig, CreateUserData } from '../types/index.js';

export interface UserValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface MerchantConfigValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates email format using a comprehensive regex pattern
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const trimmedEmail = email.trim();
  if (trimmedEmail.length === 0) {
    return false;
  }
  
  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  // Additional checks for invalid patterns
  if (trimmedEmail.includes('..')) {
    return false; // No consecutive dots
  }
  
  if (trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
    return false; // No leading or trailing dots in the entire email
  }
  
  // Check for dots at the beginning or end of local part
  const [localPart, domainPart] = trimmedEmail.split('@');
  if (!localPart || !domainPart) {
    return false;
  }
  
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return false;
  }
  
  if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
    return false;
  }
  
  return emailRegex.test(trimmedEmail);
}

/**
 * Validates password strength according to security requirements
 * Requirements: minimum 8 characters, at least one uppercase, one lowercase, one number
 */
export function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Check for common weak passwords
  const commonPasswords = ['password', '12345678', 'qwerty123', 'admin123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates merchant configuration data
 */
export function validateMerchantConfig(config: MerchantConfig): MerchantConfigValidationResult {
  const errors: string[] = [];
  
  if (!config) {
    errors.push('Merchant configuration is required');
    return { isValid: false, errors };
  }
  
  // Validate required fields
  if (!config.companyNumber || config.companyNumber.trim().length === 0) {
    errors.push('Company number is required');
  }
  

  
  // Validate currency (ISO 4217 format)
  if (!config.currency || !/^[A-Z]{3}$/.test(config.currency)) {
    errors.push('Currency must be a valid 3-letter ISO code (e.g., ILS, USD)');
  }
  
  // Validate language (ISO 639-1 format)
  if (!config.language || !/^[a-z]{2}$/.test(config.language)) {
    errors.push('Language must be a valid 2-letter ISO code (e.g., he, en)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates complete user data for registration
 */
export function validateUserData(userData: CreateUserData): UserValidationResult {
  const errors: string[] = [];
  
  // Validate email
  if (!validateEmail(userData.email)) {
    errors.push('Please provide a valid email address');
  }
  
  // Validate password
  const passwordValidation = validatePasswordStrength(userData.password);
  if (!passwordValidation.isValid) {
    errors.push(...passwordValidation.errors);
  }
  
  // Validate shop name
  if (!userData.shopName || userData.shopName.trim().length === 0) {
    errors.push('Shop name is required');
  } else if (userData.shopName.trim().length < 2) {
    errors.push('Shop name must be at least 2 characters long');
  } else if (userData.shopName.trim().length > 100) {
    errors.push('Shop name must be less than 100 characters');
  }
  
  // Validate owner name
  if (!userData.ownerName || userData.ownerName.trim().length === 0) {
    errors.push('Owner name is required');
  } else if (userData.ownerName.trim().length < 2) {
    errors.push('Owner name must be at least 2 characters long');
  } else if (userData.ownerName.trim().length > 100) {
    errors.push('Owner name must be less than 100 characters');
  }
  
  // Validate merchant configuration
  const merchantValidation = validateMerchantConfig(userData.merchantConfig);
  if (!merchantValidation.isValid) {
    errors.push(...merchantValidation.errors);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes user input by trimming whitespace and normalizing data
 */
export function sanitizeUserData(userData: CreateUserData): CreateUserData {
  return {
    email: userData.email.trim().toLowerCase(),
    password: userData.password, // Don't trim password as spaces might be intentional
    shopName: userData.shopName.trim(),
    ownerName: userData.ownerName.trim(),
    merchantConfig: {
      companyNumber: userData.merchantConfig.companyNumber.trim(),
      currency: userData.merchantConfig.currency.trim().toUpperCase(),
      language: userData.merchantConfig.language.trim().toLowerCase()
    }
  };
}