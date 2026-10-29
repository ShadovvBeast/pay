/** Country is the customer's confirmed billing country, never browser language. */
export function regionalCurrency(country: string): 'ILS' | 'UGX' {
  if (!/^[A-Z]{2}$/.test(country)) throw new Error('Invalid customer country');
  return country === 'IL' ? 'ILS' : 'UGX';
}

export function validatePaymentCurrency(amount: number, currency: string): void {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be a positive finite number');
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Invalid payment currency');
  if (currency === 'UGX' && !Number.isInteger(amount)) {
    throw new Error('Amount must be whole shillings for UGX');
  }
}

export function validateCardCurrency(currency: string): void {
  if (!['ILS', 'USD', 'EUR'].includes(currency)) {
    throw new Error('Unsupported card currency. UGX requires a compatible mobile-money account; it cannot be charged through AllPay.');
  }
}
