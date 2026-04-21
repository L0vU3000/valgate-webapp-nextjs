/**
 * Sanitizes a numeric string by removing currency symbols, commas, spaces,
 * and other non-numeric characters (except decimal point and minus sign).
 * 
 * @param s - The string to sanitize (can be undefined/null)
 * @returns The sanitized string ready for Number() parsing, or undefined if empty/invalid
 * 
 * @example
 * sanitizeNumericString("$3,000") // "3000"
 * sanitizeNumericString("€1,234.56") // "1234.56"
 * sanitizeNumericString("3,000") // "3000"
 * sanitizeNumericString("") // undefined
 * sanitizeNumericString(undefined) // undefined
 */
export function sanitizeNumericString(s?: string | null): string | undefined {
  if (s === undefined || s === null) return undefined;
  
  const trimmed = String(s).trim();
  if (!trimmed) return undefined;
  
  // Remove currency symbols: $ € £ ¥ ￥ ៛ ₩ ₹ ₫
  // Remove commas, spaces (including non-breaking spaces), and any non-digit/./- character
  const cleaned = trimmed
    .replace(/[$€£¥￥៛₩₹₫]/g, "") // Currency symbols
    .replace(/[,，\s\u00A0]/g, "") // Commas, spaces, non-breaking spaces
    .replace(/[^0-9.\-]/g, ""); // Keep only digits, decimal point, and minus sign
  
  // Return undefined if result is empty
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Parses a numeric string after sanitization, returning a number or undefined.
 * Returns undefined if the input is empty, invalid, or results in NaN.
 * 
 * @param s - The string to parse (can be undefined/null)
 * @returns A valid finite number, or undefined if parsing fails
 * 
 * @example
 * parseNumericString("$3,000") // 3000
 * parseNumericString("€1,234.56") // 1234.56
 * parseNumericString("invalid") // undefined
 * parseNumericString("") // undefined
 */
export function parseNumericString(s?: string | null): number | undefined {
  const sanitized = sanitizeNumericString(s);
  if (sanitized === undefined) return undefined;
  
  const num = Number(sanitized);
  // Return undefined if NaN or not finite (handles Infinity cases)
  return Number.isFinite(num) ? num : undefined;
}

