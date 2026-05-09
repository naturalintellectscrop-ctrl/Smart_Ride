/**
 * API Validation Utilities
 * Zod-based validation for API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate request body against a Zod schema
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const zodError = result.error as z.ZodError;
      return {
        success: false,
        error: zodError.errors[0]?.message || 'Validation error',
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Invalid JSON body',
    };
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  try {
    const { searchParams } = new URL(request.url);
    const query: Record<string, string | string[]> = {};

    searchParams.forEach((value, key) => {
      const existing = query[key];
      if (existing) {
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          query[key] = [existing, value];
        }
      } else {
        query[key] = value;
      }
    });

    const result = schema.safeParse(query);

    if (!result.success) {
      const zodError = result.error as z.ZodError;
      return {
        success: false,
        error: zodError.errors[0]?.message || 'Validation error',
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Invalid query parameters',
    };
  }
}

/**
 * Validate path parameters against a Zod schema
 */
export function validateParams<T>(
  params: Record<string, string>,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  try {
    const result = schema.safeParse(params);

    if (!result.success) {
      const zodError = result.error as z.ZodError;
      return {
        success: false,
        error: zodError.errors[0]?.message || 'Validation error',
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Invalid parameters',
    };
  }
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // ID validation
  cuid: z.string().startsWith('c', 'Invalid ID'),
  id: z.string().min(1, 'ID is required'),
  
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
  
  // Date range
  dateRange: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }),
  
  // Search
  search: z.object({
    search: z.string().min(1).optional(),
    q: z.string().min(1).optional(),
  }),
  
  // Phone number (Uganda)
  phone: z.string().regex(/^(\+256|0)[0-9]{9}$/, 'Invalid phone number'),
  
  // Email
  email: z.string().email('Invalid email address'),
  
  // Coordinates
  coordinates: z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
  }),
  
  // Status filter
  statusFilter: z.object({
    status: z.string().optional(),
  }),
};

/**
 * Higher-order function to wrap API handlers with validation
 */
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (req: NextRequest, data: T, context?: unknown) => Promise<NextResponse>,
  source: 'body' | 'query' = 'body'
) {
  return async (req: NextRequest, context?: unknown) => {
    let result: ValidationResult<T>;

    if (source === 'body') {
      result = await validateBody(req, schema);
    } else {
      result = validateQuery(req, schema);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return handler(req, result.data!, context);
  };
}
