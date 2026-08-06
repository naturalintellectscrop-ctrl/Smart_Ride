/**
 * Safe coercion of query-string parameters to Prisma enum values.
 *
 * Query params arrive as `string | null`. Passing one straight into a Prisma
 * enum filter type-errors, and — more importantly — passing an UNKNOWN string
 * makes Prisma throw at query time, turning a bad query param into a 500.
 * Casting with `as` silences the compiler but keeps the 500.
 *
 * These helpers validate against the generated enum object and return
 * `undefined` for anything unrecognised, so an invalid filter is simply not
 * applied instead of crashing the request.
 *
 *   import { UserRole } from '@prisma/client';
 *   const role = enumParam(UserRole, searchParams.get('role'));
 *   if (role) where.role = role;
 */

/**
 * Returns `value` when it is a member of `enumObject`, otherwise `undefined`.
 * `'ALL'` and empty strings are treated as "no filter".
 */
export function enumParam<T extends Record<string, string>>(
  enumObject: T,
  value: string | null | undefined
): T[keyof T] | undefined {
  if (!value || value === 'ALL' || value === 'all') return undefined;
  const members = Object.values(enumObject) as string[];
  return members.includes(value) ? (value as T[keyof T]) : undefined;
}

/**
 * Like `enumParam`, but for endpoints where an unrecognised value should be a
 * client error rather than a silently-dropped filter (e.g. a status the caller
 * is trying to WRITE). Returns null when invalid so the caller can 400.
 */
export function requireEnumParam<T extends Record<string, string>>(
  enumObject: T,
  value: string | null | undefined
): T[keyof T] | null {
  if (!value) return null;
  const members = Object.values(enumObject) as string[];
  return members.includes(value) ? (value as T[keyof T]) : null;
}

/** Comma-separated list of enum values, invalid entries dropped. */
export function enumListParam<T extends Record<string, string>>(
  enumObject: T,
  value: string | null | undefined
): T[keyof T][] | undefined {
  if (!value) return undefined;
  const members = Object.values(enumObject) as string[];
  const parsed = value
    .split(',')
    .map(v => v.trim())
    .filter(v => members.includes(v)) as T[keyof T][];
  return parsed.length > 0 ? parsed : undefined;
}
