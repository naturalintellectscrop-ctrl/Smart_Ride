/**
 * GET /api/receipts/[id]        → receipt JSON (id or receiptNumber), owner/admin only.
 * GET /api/receipts/[id]?format=html → branded HTML (used by the mobile PDF export).
 *
 * Privacy-safe: the Receipt record holds first names only, never phone numbers.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, setRLSContext, resetRLSContext } from '@/lib/db';
import { requireAuth, isAdmin } from '@/lib/auth/guards';
import { renderReceiptHtml } from '@/lib/receipts/receipt-html';
import { firstNameOf } from '@/lib/privacy/public-contact';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(request);
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode });
  }
  const user = auth.user!;
  await setRLSContext({ userId: user.userId, role: user.role });
  try {
    const { id } = await params;
    const receipt = await db.receipt.findFirst({
      where: { OR: [{ id }, { receiptNumber: id }] },
    });
    if (!receipt) {
      return NextResponse.json({ success: false, error: 'Receipt not found' }, { status: 404 });
    }
    // Ownership: owner or admin only.
    if (!isAdmin(user.role) && receipt.userId !== user.userId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    if (new URL(request.url).searchParams.get('format') === 'html') {
      const owner = receipt.userId
        ? await db.user.findUnique({ where: { id: receipt.userId }, select: { name: true } })
        : null;
      const html = renderReceiptHtml(receipt, { customerFirstName: firstNameOf(owner?.name) });
      return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    return NextResponse.json({ success: true, data: receipt });
  } catch (error) {
    console.error('[receipts/[id] GET] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load receipt' }, { status: 500 });
  } finally {
    await resetRLSContext();
  }
}
