/** Compact shekel amount for KPIs: ₪ 1.25B / ₪ 60.9M / ₪ 25K / ₪ 900. */
export function formatShekels(amount: number): string {
  if (amount >= 1_000_000_000) return `₪ ${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000) return `₪ ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₪ ${(amount / 1_000).toFixed(0)}K`;
  return `₪ ${amount.toLocaleString('he-IL')}`;
}
