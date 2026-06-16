/**
 * Decimal utility helpers for Prisma Decimal type compatibility.
 *
 * Prisma returns `Decimal` objects for `Decimal` fields in the schema.
 * This module provides conversion helpers to bridge between `Decimal`
 * and plain `number` values used throughout the application.
 *
 * IMPORTANT: We convert Decimal to number at read boundaries because:
 * 1. The existing codebase was built for Float (number) values
 * 2. JavaScript arithmetic operators work naturally with numbers
 * 3. JSON serialization handles numbers natively
 * 4. The precision benefit of Decimal is preserved in the database;
 *    converting to number at the application layer is acceptable since
 *    we're dealing with display and API response values, not further
 *    precision-critical calculations.
 */

import type { Decimal } from '@prisma/client/runtime/library';

/**
 * Convert a Prisma Decimal (or number, or null/undefined) to a plain number.
 * Returns 0 for null/undefined values.
 */
export function toNumber(value: Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  // Decimal.js instances have a toNumber() method
  return Number(value);
}

/**
 * Convert a Prisma Decimal (or number, or null/undefined) to a number or null.
 * Returns null for null/undefined values (preserves nullability).
 */
export function toNumberOrNull(value: Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  return Number(value);
}

/**
 * Safely add two Decimal/number values, returning a plain number.
 */
export function addDecimals(a: Decimal | number | null | undefined, b: Decimal | number | null | undefined): number {
  return toNumber(a) + toNumber(b);
}

/**
 * Safely subtract two Decimal/number values, returning a plain number.
 */
export function subtractDecimals(a: Decimal | number | null | undefined, b: Decimal | number | null | undefined): number {
  return toNumber(a) - toNumber(b);
}
