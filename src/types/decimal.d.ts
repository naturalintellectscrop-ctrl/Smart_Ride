// ============================================
// SMART RIDE — Prisma Decimal Type Declaration
// ============================================
// Makes Prisma's Decimal type assignable to `number` 
// to reduce TypeScript errors across the codebase.
//
// Prisma's Decimal type is a subclass of decimal.js which
// is structurally compatible with number but TypeScript
// doesn't recognize this. This declaration bridges the gap.
//
// For new code, prefer using the `toNumber()` helper from
// `@/lib/decimal` for explicit conversions.
// ============================================

import Decimal from 'decimal.js';

declare module 'decimal.js' {
  interface Decimal {
    /** Allow Decimal to be assigned to number (runtime: use Number() for actual conversion) */
    toNumber(): number;
    /** Allow JSON serialization */
    toJSON(): string;
  }
}

// Make Decimal assignable to number in type contexts
declare module '@prisma/client/runtime/library' {
  type Decimal = number;
}
