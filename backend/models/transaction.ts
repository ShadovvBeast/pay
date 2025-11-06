import type { Transaction, CreateTransactionData } from '../types/index.js';

export interface TransactionValidationResult {
    isValid: boolean;
    errors: string[];
}

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';

/**
 * Validates transaction amount
 */
export function validateAmount(amount: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof amount !== 'number') {
        errors.push('Amount must be a number');
        return { isValid: false, errors };
    }

    if (isNaN(amount) || !isFinite(amount)) {
        errors.push('Amount must be a valid number');
        return { isValid: false, errors };
    }

    if (amount <= 0) {
        errors.push('Amount must be greater than zero');
    }

    // Check for reasonable maximum (1 million in base currency)
    if (amount > 1000000) {
        errors.push('Amount exceeds maximum allowed value');
    }

    // Check for proper decimal places (max 2 decimal places for currency)
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
        errors.push('Amount cannot have more than 2 decimal places');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validates currency code (ISO 4217 format)
 */
export function validateCurrency(currency: string): boolean {
    if (!currency || typeof currency !== 'string') {
        return false;
    }

    // ISO 4217 currency codes are 3 uppercase letters
    const currencyRegex = /^[A-Z]{3}$/;
    return currencyRegex.test(currency.trim());
}

/**
 * Validates payment URL format
 */
export function validatePaymentUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
        return false;
    }

    try {
        const parsedUrl = new URL(url);
        // Must be HTTPS for security
        return parsedUrl.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Validates transaction status
 */
export function validateTransactionStatus(status: string): status is TransactionStatus {
    const validStatuses: TransactionStatus[] = ['pending', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'];
    return validStatuses.includes(status as TransactionStatus);
}

/**
 * Validates AllPay transaction ID format
 */
export function validateAllPayTransactionId(id: string): boolean {
    if (!id || typeof id !== 'string') {
        return false;
    }

    // AllPay transaction IDs are typically alphanumeric
    const idRegex = /^[a-zA-Z0-9_-]+$/;
    return idRegex.test(id.trim()) && id.trim().length >= 3 && id.trim().length <= 100;
}

/**
 * Validates user ID format (UUID)
 */
export function validateUserId(userId: string): boolean {
    if (!userId || typeof userId !== 'string') {
        return false;
    }

    // UUID format (any version)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(userId.trim());
}

/**
 * Validates complete transaction creation data
 */
export function validateCreateTransactionData(data: CreateTransactionData): TransactionValidationResult {
    const errors: string[] = [];

    // Validate user ID
    if (!validateUserId(data.userId)) {
        errors.push('Invalid user ID format');
    }

    // Validate amount
    const amountValidation = validateAmount(data.amount);
    if (!amountValidation.isValid) {
        errors.push(...amountValidation.errors);
    }

    // Validate currency
    if (!validateCurrency(data.currency)) {
        errors.push('Currency must be a valid 3-letter ISO code (e.g., ILS, USD)');
    }

    // Validate payment URL
    if (!validatePaymentUrl(data.paymentUrl)) {
        errors.push('Payment URL must be a valid HTTPS URL');
    }

    // Validate AllPay transaction ID if provided
    if (data.allpayTransactionId && !validateAllPayTransactionId(data.allpayTransactionId)) {
        errors.push('Invalid AllPay transaction ID format');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validates complete transaction data
 */
export function validateTransaction(transaction: Transaction): TransactionValidationResult {
    const errors: string[] = [];

    // Validate ID
    if (!validateUserId(transaction.id)) {
        errors.push('Invalid transaction ID format');
    }

    // Validate user ID
    if (!validateUserId(transaction.userId)) {
        errors.push('Invalid user ID format');
    }

    // Validate amount
    const amountValidation = validateAmount(transaction.amount);
    if (!amountValidation.isValid) {
        errors.push(...amountValidation.errors);
    }

    // Validate currency
    if (!validateCurrency(transaction.currency)) {
        errors.push('Currency must be a valid 3-letter ISO code');
    }

    // Validate payment URL
    if (!validatePaymentUrl(transaction.paymentUrl)) {
        errors.push('Payment URL must be a valid HTTPS URL');
    }

    // Validate status
    if (!validateTransactionStatus(transaction.status)) {
        errors.push('Invalid transaction status');
    }

    // Validate AllPay transaction ID
    if (!validateAllPayTransactionId(transaction.allpayTransactionId)) {
        errors.push('Invalid AllPay transaction ID format');
    }

    // Validate dates
    if (!(transaction.createdAt instanceof Date) || isNaN(transaction.createdAt.getTime())) {
        errors.push('Invalid created date');
    }

    if (!(transaction.updatedAt instanceof Date) || isNaN(transaction.updatedAt.getTime())) {
        errors.push('Invalid updated date');
    }

    // Validate date logic
    if (transaction.createdAt && transaction.updatedAt && transaction.updatedAt < transaction.createdAt) {
        errors.push('Updated date cannot be before created date');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Sanitizes transaction creation data
 */
export function sanitizeCreateTransactionData(data: CreateTransactionData): CreateTransactionData {
    return {
        userId: data.userId.trim(),
        amount: Math.round(data.amount * 100) / 100, // Round to 2 decimal places
        currency: data.currency.trim().toUpperCase(),
        paymentUrl: data.paymentUrl.trim(),
        allpayTransactionId: data.allpayTransactionId?.trim()
    };
}

/**
 * Checks if a transaction status transition is valid
 */
export function isValidStatusTransition(currentStatus: TransactionStatus, newStatus: TransactionStatus): boolean {
    const validTransitions: Record<TransactionStatus, TransactionStatus[]> = {
        pending: ['completed', 'failed', 'cancelled'],
        completed: ['refunded', 'partially_refunded'], // allow refunds
        failed: ['pending'], // Failed transactions can be retried
        cancelled: [],
        refunded: [],
        partially_refunded: ['refunded'] // partial can become full refund
    };

    return validTransitions[currentStatus].includes(newStatus);
}

/**
 * Gets the next possible statuses for a transaction
 */
export function getValidNextStatuses(currentStatus: TransactionStatus): TransactionStatus[] {
    const validTransitions: Record<TransactionStatus, TransactionStatus[]> = {
        pending: ['completed', 'failed', 'cancelled'],
        completed: ['refunded', 'partially_refunded'],
        failed: ['pending'],
        cancelled: [],
        refunded: [],
        partially_refunded: ['refunded']
    };

    return validTransitions[currentStatus] || [];
}

/**
 * Checks if a transaction is in a final state
 */
export function isTransactionFinal(status: TransactionStatus): boolean {
    return status === 'completed' || status === 'cancelled' || status === 'refunded';
}

/**
 * Formats amount for display (adds currency symbol and proper formatting)
 */
export function formatTransactionAmount(amount: number, currency: string): string {
    const currencySymbols: Record<string, string> = {
        'ILS': '₪',
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'UGX': 'USh'
    };

    const symbol = currencySymbols[currency.toUpperCase()] || currency;
    return `${symbol}${amount.toFixed(2)}`;
}