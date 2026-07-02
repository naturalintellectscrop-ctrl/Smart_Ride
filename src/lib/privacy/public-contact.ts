/**
 * Server-side contact privacy.
 *
 * STRICT BUSINESS RULE: full phone numbers must NEVER leave the backend to any
 * non-admin caller. Counterparties (customer ↔ rider/driver/merchant/pharmacist)
 * see FIRST NAMES ONLY — never a surname, phone, or email. Only the Admin
 * Dashboard APIs (under /api/admin/*, which do NOT use these helpers) may return
 * raw phone numbers.
 *
 * These helpers redact in place so privacy does not depend on the frontend, while
 * preserving unrelated fields (e.g. a rider's live tracking coordinates).
 */

/** First token of a person's name (e.g. "John Doe" → "John"). Never a number. */
export function firstNameOf(name?: string | null): string {
  if (!name) return '';
  const trimmed = String(name).trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0];
}

/**
 * Redact a PERSON counterparty (customer, rider, driver, delivery, pharmacist)
 * IN PLACE: collapse the name to a first name and drop phone/email. All other
 * fields (id, avatarUrl, rating, tracking coords, role…) are preserved.
 */
export function redactPerson<T extends Record<string, any>>(
  obj: T | null | undefined,
  nameField: 'name' | 'fullName' = 'name',
): T | null | undefined {
  if (!obj || typeof obj !== 'object') return obj;
  const first = firstNameOf(obj[nameField]);
  (obj as Record<string, unknown>)[nameField] = first;
  (obj as Record<string, unknown>).firstName = first;
  for (const k of ['phone', 'email']) {
    if (k in obj) delete (obj as Record<string, unknown>)[k];
  }
  return obj;
}

/**
 * Redact a BUSINESS counterparty (merchant / pharmacy store) IN PLACE: drop the
 * contact phone/email and banking details. The public store name/address stays.
 */
export function redactBusiness<T extends Record<string, any>>(obj: T | null | undefined): T | null | undefined {
  if (!obj || typeof obj !== 'object') return obj;
  for (const k of ['phone', 'email', 'bankName', 'bankAccountName', 'bankAccountNumber']) {
    if (k in obj) delete (obj as Record<string, unknown>)[k];
  }
  return obj;
}
