/**
 * TR: +90 5XX XXX XX XX
 * AZ: +994 5X XXX XX XX
 * KG: +996 7XX XXX XXX
 */
export type PhoneCountry = "TR" | "AZ" | "KG";

const TR_REGEX = /^\+?90\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}$/;
const AZ_REGEX = /^\+?994\s*5\d\s*\d{3}\s*\d{2}\s*\d{2}$/;
const KG_REGEX = /^\+?996\s*7\d{2}\s*\d{3}\s*\d{3}$/;

export function validatePhone(value: string): { valid: boolean; country?: PhoneCountry; error?: string } {
  const raw = value.trim();
  if (!raw) return { valid: true };
  const normalized = raw.replace(/\s/g, "").replace(/^00/, "+");
  if (TR_REGEX.test(normalized)) return { valid: true, country: "TR" };
  const trDigits = normalized.replace(/^\+90/, "").replace(/^90/, "").replace(/^0/, "");
  if (trDigits.length === 10 && /^5\d{9}$/.test(trDigits)) return { valid: true, country: "TR" };
  if (AZ_REGEX.test(normalized)) return { valid: true, country: "AZ" };
  if (KG_REGEX.test(normalized)) return { valid: true, country: "KG" };
  return {
    valid: false,
    error: "TR: +90 5XX XXX XX XX, AZ: +994 5X XXX XX XX, KG: +996 7XX XXX XXX",
  };
}
