/**
 * The printed land area in a document, as a number string, or `""` when the document did not state one.
 *
 * Cambodian land documents state area in ways that a digit grab gets wrong, and every wrong way has a
 * live example in the KLYP corpus:
 *
 *   `725 ម២`                                 → 725        plain, with the Khmer unit
 *   `អ២,២២២ ម៉ែត្រការ៉េ`                       → 2222       Khmer numerals, comma-grouped
 *   `01 87 00`                               → 18700      Khmer-style grouping with spaces
 *   `1,407 ម៉ែត្រក្រឡា`                       → 1407       comma-grouped
 *   `ទទឹង 34,4 ម៉ែត្រ និង បណ្ដោយ 70,5…`        → ""         dimensions, joined by the word "and"
 *   `14m x 38m`                              → ""         dimensions
 *   `1/2 ៦០០ម២`                              → ""         a half share, not an area
 *   `48,20`                                  → 4820       a form line the model put in the wrong field
 *
 * The last one is deliberately NOT rejected: it is syntactically a number, and the only thing wrong
 * with it is that it belongs to another field. A rule cannot see the document, so it stays a
 * comparison that fails loudly rather than a value silently dropped.
 *
 * A dimension string yields `""` rather than a product: multiplying a width by a length would be our
 * arithmetic, not the document's.
 */

/** Khmer numerals to ASCII, so `អ២,២២២` compares as 2222 instead of being skipped as unreadable. */
export function normalizeDigits(s: string): string {
  return s.replace(/[០-៩]/g, (c) => String(c.charCodeAt(0) - 0x17e0));
}

export function printedArea(s: string): string {
  if (!s) return "";
  const t = normalizeDigits(s);
  // Dimensions: an `x`, an asterisk, or the Khmer/English word for "and" between two numbers.
  if (/(?:x|×|\*|\band\b|និង)/i.test(t)) return "";
  // A share of a parcel is not a parcel area.
  if (/\d\s*\/\s*\d/.test(t)) return "";
  const m = t.match(/\d[\d.,\s]*\d|\d/);
  if (!m) return "";
  return (
    m[0]
      .replace(/\s+/g, "") // "01 87 00" is one number, grouped
      .replace(/[.,](?=\d{3}\b)/g, "")
      .replace(/[.,]+$/, "")
      .replace(/,/g, "")
      .replace(/^0+(?=\d)/, "") // leading zeros from a space-grouped number
  );
}
