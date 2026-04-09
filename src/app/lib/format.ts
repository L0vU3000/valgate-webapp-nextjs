/**
 * Compact currency format: $1.28M, $456K, $800
 */
export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

/**
 * Full locale currency format: $1,278,000
 */
export function formatCurrencyFull(n: number): string {
  return "$" + n.toLocaleString();
}
