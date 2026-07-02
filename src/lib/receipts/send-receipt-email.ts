/**
 * Send a branded HTML receipt email after a transaction completes.
 * Best-effort: never throws into the caller (completion must not fail if email
 * is down). Marks Receipt.emailedAt on success. Privacy-safe — the rendered
 * HTML contains first names only, no phone numbers.
 */
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logging/logger';
import { firstNameOf } from '@/lib/privacy/public-contact';
import { renderReceiptHtml, receiptEmailSubject } from './receipt-html';

export async function sendReceiptEmail(receiptId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const receipt = await db.receipt.findUnique({ where: { id: receiptId } });
    if (!receipt) return { success: false, error: 'Receipt not found' };
    if (receipt.emailedAt) return { success: true }; // already sent — idempotent

    const user = receipt.userId
      ? await db.user.findUnique({ where: { id: receipt.userId }, select: { email: true, name: true } })
      : null;
    if (!user?.email) return { success: false, error: 'No customer email on file' };

    const html = renderReceiptHtml(receipt, { customerFirstName: firstNameOf(user.name) });
    const result = await sendEmail({
      to: user.email,
      subject: receiptEmailSubject(receipt),
      html,
    });

    if (result.success) {
      await db.receipt.update({ where: { id: receipt.id }, data: { emailedAt: new Date() } });
    }
    return result;
  } catch (error) {
    logger.error('[receipt-email] failed', { error: String(error) });
    return { success: false, error: 'Failed to send receipt email' };
  }
}
