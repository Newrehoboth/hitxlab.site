import type { License } from "@/lib/licenses";

/**
 * Formats a number as Nigerian Naira (₦)
 * e.g., 25000 -> "₦25,000"
 */
export function fmtNaira(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return "₦0";
  return "₦" + Math.round(amount).toLocaleString("en-NG");
}

/**
 * Formats a license price, returning "Negotiable" if isNegotiable is true or price is 0
 */
export function fmtLicensePrice(lic: License): string {
  if (lic.isNegotiable || (lic.exclusive && lic.price <= 0)) {
    return "Negotiable";
  }
  return fmtNaira(lic.price);
}
