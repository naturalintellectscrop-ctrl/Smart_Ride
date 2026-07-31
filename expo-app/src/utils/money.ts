/**
 * Money formatting.
 *
 * Do NOT use Number.prototype.toLocaleString() for amounts in this app. On
 * Hermes without full ICU, toLocaleString() silently returns an ungrouped
 * string — "8450" instead of "8,450" — so every fare, balance and earnings
 * figure rendered as a hard-to-read run of digits. These helpers group the
 * digits themselves so the output is identical on every device and build.
 */

/** Group a whole number with commas: 8500 -> "8,500". */
export function formatAmount(value: number | string | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  const rounded = Math.round(Math.abs(n));
  const grouped = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n < 0 ? `-${grouped}` : grouped;
}

/** Format an amount with the currency prefix: 8500 -> "UGX 8,500". */
export function formatUGX(value: number | string | null | undefined): string {
  return `UGX ${formatAmount(value)}`;
}

/**
 * Render a rider/merchant rating honestly.
 *
 * Rider.rating defaults to 5.0 in the schema, so an unrated rider used to
 * display a confident "5.00" that no customer had actually given. When there
 * are no ratings yet, say so instead of inventing one.
 */
export function formatRating(
  rating: number | null | undefined,
  ratingCount?: number | null
): string {
  if (rating == null || (ratingCount != null && ratingCount <= 0)) return 'New';
  return rating.toFixed(1);
}
