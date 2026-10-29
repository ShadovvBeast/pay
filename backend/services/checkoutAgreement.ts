export interface CheckoutConsent {
  accepted: true;
  termsVersion: string;
  privacyVersion: string;
  productSchedule: Record<string, unknown>;
}

/** Authenticated merchants attest acceptance; the server supplies time and charged terms. */
export function agreementSnapshot(consent: CheckoutConsent, amount: number, currency: string, country?: string) {
  if (consent.accepted !== true || !consent.termsVersion?.trim() || !consent.privacyVersion?.trim()) {
    throw new Error('Invalid checkout agreement acceptance');
  }
  return {
    termsVersion: consent.termsVersion,
    privacyVersion: consent.privacyVersion,
    accepted: true,
    recordedAt: new Date().toISOString(),
    productSchedule: { ...consent.productSchedule, amount, currency, customerCountry: country || null, automaticRenewal: false },
  };
}
