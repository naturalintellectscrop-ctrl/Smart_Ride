/**
 * GET /api/merchants/[id]/products
 * Alias for /api/merchants/[id]/menu - returns merchant's menu/product items
 * This route exists for backward compatibility with the mobile app
 */

import { NextRequest } from 'next/server';
import { GET as menuGET } from '../menu/route';

export async function GET(request: NextRequest) {
  // Delegate to the menu handler
  return menuGET(request);
}
