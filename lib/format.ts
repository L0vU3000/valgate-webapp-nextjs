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

/**
 * Relative time from a Unix ms timestamp: "2m ago", "3h ago", "Yesterday", "Feb 14"
 */
export function formatRelativeTime(createdAt: number): string {
  const diff = Date.now() - createdAt;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
