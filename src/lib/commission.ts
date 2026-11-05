/**
 * Marketplace commission rules.
 * Commission is ALWAYS derived from the gross sale amount, never from producer earnings.
 * These helpers are shared for display; the authoritative calculation happens server-side.
 */
export const PLATFORM_COMMISSION_RATE = 0.1; // 10%

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type CommissionSplit = {
  grossAmount: number;
  platformCommission: number;
  producerEarnings: number;
  providerFee: number;
  netAmount: number;
  rate: number;
};

export function calculateSplit(grossAmount: number, providerFee = 0): CommissionSplit {
  const gross = round2(Math.max(0, grossAmount));
  const fee = round2(Math.max(0, providerFee));
  const platformCommission = round2(gross * PLATFORM_COMMISSION_RATE);
  const producerEarnings = round2(gross - platformCommission);
  return {
    grossAmount: gross,
    platformCommission,
    producerEarnings,
    providerFee: fee,
    netAmount: round2(gross - fee),
    rate: PLATFORM_COMMISSION_RATE,
  };
}
