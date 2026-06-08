/**
 * Shared Zod validation schemas for API routes
 *
 * Reuse these schemas across routes to maintain consistent validation.
 * Import from `@/lib/validation/api-schemas`.
 */

import { z } from 'zod';

// Phone number (E.164-like format)
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number');

// Monetary amount
export const amountSchema = z.number().positive().max(10000000, 'Amount exceeds maximum');

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Geographic coordinates
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
