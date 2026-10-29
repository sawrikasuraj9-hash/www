/**
 * Universal WhatsApp Phone Number Normalizer
 * Properly handles international numbers, Sri Lankan local format (07x),
 * duplicate country codes (9494...), country code + 0 (9407x...), and raw 9-digit formats.
 */
export function normalizeWhatsAppNumber(raw: string, defaultCc: string = "94"): string {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";

  // Strip international prefix "00" (e.g. 009474... -> 9474...)
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // Strip repeated country code prefixes: 9494... -> 94...
  while (digits.startsWith("9494")) {
    digits = digits.slice(2);
  }

  // Handle Sri Lankan 9407x (country code followed by trunk 0: 940743865934 -> 94743865934)
  if (digits.startsWith("940") && digits.length >= 11) {
    digits = "94" + digits.slice(3);
  }

  // Handle local format with leading 0: 0743865934 -> 94743865934
  if (digits.startsWith("0") && digits.length === 10) {
    digits = defaultCc + digits.slice(1);
  }

  // Handle 9-digit local mobile number without leading 0: 743865934 -> 94743865934
  if (digits.length === 9) {
    digits = defaultCc + digits;
  }

  return digits;
}

/**
 * Format normalized phone number nicely for display (e.g. +94 74 386 5934)
 */
export function formatPhoneDisplay(normalized: string): string {
  if (!normalized) return "";
  if (normalized.startsWith("94") && normalized.length === 11) {
    return "+94 " + normalized.slice(2, 4) + " " + normalized.slice(4, 7) + " " + normalized.slice(7);
  }
  return "+" + normalized;
}
