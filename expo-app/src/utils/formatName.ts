// ============================================
// SMART RIDE MOBILE - NAME FORMATTING
// ============================================
// Privacy rule: never expose a user's full identity to another user.
// When addressing/displaying ANOTHER participant (client ↔ driver ↔ merchant
// ↔ pharmacist), show ONLY their first name — the name they registered with.
// ============================================

/**
 * Return the first name only (first whitespace-delimited token).
 * Used everywhere one user is shown another user's name.
 *
 * firstName('John Doe Smith') → 'John'
 * firstName('')               → fallback
 */
export function firstName(name?: string | null, fallback = 'there'): string {
  if (!name) return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0];
}
