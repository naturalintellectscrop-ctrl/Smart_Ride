// ============================================
// SMART RIDE — Decimal Utility Functions
// ============================================
// Prisma's Decimal type is not a native JavaScript number.
// It's a Prisma.Decimal object that needs conversion.
// Use these helpers to safely work with Decimal fields.
// ============================================

import { Prisma } from '@prisma/client';

/**
 * Convert a Prisma Decimal to a JavaScript number.
 * Returns 0 for null/undefined values.
 */
export function toNumber(value: Prisma.Decimal | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

/**
 * Convert a Prisma Decimal to a JavaScript number, returning null for null/undefined.
 */
export function toNumberOrNull(value: Prisma.Decimal | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

/**
 * Add two Decimal values, returning a number.
 */
export function addDecimals(a: Prisma.Decimal | null | undefined, b: Prisma.Decimal | null | undefined): number {
  return toNumber(a) + toNumber(b);
}

/**
 * Subtract two Decimal values, returning a number.
 */
export function subtractDecimals(a: Prisma.Decimal | null | undefined, b: Prisma.Decimal | null | undefined): number {
  return toNumber(a) - toNumber(b);
}

/**
 * Multiply two Decimal values, returning a number.
 */
export function multiplyDecimals(a: Prisma.Decimal | null | undefined, b: Prisma.Decimal | null | undefined): number {
  return toNumber(a) * toNumber(b);
}

/**
 * Check if a Decimal value is less than a number.
 */
export function decimalLessThan(value: Prisma.Decimal | null | undefined, threshold: number): boolean {
  return toNumber(value) < threshold;
}

/**
 * Check if a Decimal value is greater than a number.
 */
export function decimalGreaterThan(value: Prisma.Decimal | null | undefined, threshold: number): boolean {
  return toNumber(value) > threshold;
}

/**
 * Check if a Decimal value equals a number.
 */
export function decimalEquals(value: Prisma.Decimal | null | undefined, target: number): boolean {
  return toNumber(value) === target;
}

/**
 * Create a Prisma Decimal from a number.
 */
export function toDecimal(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

/**
 * Format a Decimal as a currency string (UGX).
 */
export function formatCurrency(value: Prisma.Decimal | number | null | undefined): string {
  const num = typeof value === 'number' ? value : toNumber(value);
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
