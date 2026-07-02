/**
 * Branded Smart Ride receipt HTML — shared by the email body and the mobile
 * "download PDF" render. Privacy-first: renders only fields stored on the
 * Receipt (first name, rating, addresses) — never a phone number.
 *
 * Original Smart Ride branding (Natural Intellects). Not modelled on any other
 * provider's layout.
 */
import type { Receipt } from '@prisma/client';

const SUPPORT_EMAIL = 'support@smartride.ug';
const BRAND = '#005f3a';

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Cash',
  MTN_MOMO: 'MTN Mobile Money',
  AIRTEL_MONEY: 'Airtel Money',
  CARD: 'Card',
  VISA: 'Visa / Card',
  WALLET: 'Smart Ride Wallet',
  NYLON_PAY: 'Mobile Money',
};

const money = (n: number, currency = 'UGX') =>
  `${currency} ${Math.round(n).toLocaleString('en-UG')}`;

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

function stars(rating?: number | null): string {
  if (!rating) return '';
  const full = Math.round(Math.max(0, Math.min(5, rating)));
  return '★★★★★☆☆☆☆☆'.slice(5 - full, 10 - full);
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

export function paymentLabel(method?: string | null, status?: string | null): string {
  const base = (method && PAYMENT_LABEL[method]) || 'Mobile Money';
  if (method === 'CASH' && status && status !== 'COMPLETED') return 'Cash (to be paid on delivery)';
  return base;
}

type Line = { label: string; amount: number };

export function renderReceiptHtml(receipt: Receipt, opts?: { customerFirstName?: string | null }): string {
  const lines: Line[] = Array.isArray(receipt.breakdown) ? (receipt.breakdown as unknown as Line[]) : [];
  const currency = receipt.currency || 'UGX';
  const total = Number(receipt.total);
  const greetingName = opts?.customerFirstName ? `, ${esc(opts.customerFirstName)}` : '';
  const paid = paymentLabel(receipt.paymentMethod, receipt.paymentStatus);

  const row = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:6px 0;color:#5b6b63;font-size:13px;">${esc(label)}</td>
      <td style="padding:6px 0;text-align:right;font-size:13px;${strong ? 'font-weight:700;color:#0d1b14;' : 'color:#0d1b14;'}">${value}</td>
    </tr>`;

  const breakdownRows = lines
    .map((l) => row(l.label, `${l.amount < 0 ? '-' : ''}${money(Math.abs(l.amount), currency)}`))
    .join('');

  const routeBlock =
    receipt.pickupAddress || receipt.dropoffAddress
      ? `
      <div style="border-top:1px solid #eef1ef;margin-top:16px;padding-top:16px;">
        ${receipt.pickupAddress ? `<div style="margin-bottom:10px;"><div style="font-size:11px;color:#8a978f;text-transform:uppercase;letter-spacing:.5px;">Pickup</div><div style="font-size:14px;color:#0d1b14;">${esc(receipt.pickupAddress)}</div></div>` : ''}
        ${receipt.dropoffAddress ? `<div><div style="font-size:11px;color:#8a978f;text-transform:uppercase;letter-spacing:.5px;">Dropoff</div><div style="font-size:14px;color:#0d1b14;">${esc(receipt.dropoffAddress)}</div></div>` : ''}
      </div>`
      : '';

  const providerBlock = receipt.providerName
    ? `
      <div style="border-top:1px solid #eef1ef;margin-top:16px;padding-top:16px;">
        <div style="font-size:11px;color:#8a978f;text-transform:uppercase;letter-spacing:.5px;">Your ${receipt.type === 'RIDE' ? 'Rider' : 'Provider'}</div>
        <div style="font-size:16px;font-weight:600;color:#0d1b14;margin-top:2px;">${esc(receipt.providerName)}</div>
        ${receipt.providerRating ? `<div style="color:#f5a623;font-size:14px;letter-spacing:2px;">${stars(receipt.providerRating)}</div>` : ''}
      </div>`
    : '';

  const routeImg = receipt.routeImageUrl
    ? `<img src="${esc(receipt.routeImageUrl)}" alt="Route" style="width:100%;border-radius:12px;margin-top:16px;" />`
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f3f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);">
      <div style="background:${BRAND};padding:22px 24px;">
        <div style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:.5px;">SMART RIDE</div>
        <div style="color:#cfe9dd;font-size:13px;margin-top:4px;">Thank you for choosing Smart Ride${greetingName}.</div>
      </div>
      <div style="padding:24px;">
        <div style="font-size:11px;color:#8a978f;text-transform:uppercase;letter-spacing:.5px;">Total Paid</div>
        <div style="font-size:32px;font-weight:800;color:#0d1b14;line-height:1.1;">${money(total, currency)}</div>
        <div style="font-size:13px;color:#5b6b63;margin-top:4px;">Paid via ${esc(paid)}</div>

        <div style="border-top:1px solid #eef1ef;margin-top:16px;padding-top:16px;">
          <table style="width:100%;border-collapse:collapse;">
            ${row('Receipt Number', esc(receipt.receiptNumber), true)}
            ${row('Date', fmtDate(receipt.issuedAt))}
            ${receipt.serviceLabel ? row('Service', esc(receipt.serviceLabel)) : ''}
            ${receipt.vehicleType ? row('Vehicle Type', esc(receipt.vehicleType)) : ''}
            ${receipt.distanceKm ? row('Distance', `${receipt.distanceKm.toFixed(1)} km`) : ''}
            ${receipt.durationMin ? row('Duration', `${receipt.durationMin} min`) : ''}
          </table>
        </div>

        ${routeImg}
        ${routeBlock}

        <div style="border-top:1px solid #eef1ef;margin-top:16px;padding-top:16px;">
          <div style="font-size:11px;color:#8a978f;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Fare Breakdown</div>
          <table style="width:100%;border-collapse:collapse;">
            ${breakdownRows}
            <tr><td colspan="2" style="border-top:1px solid #eef1ef;padding-top:8px;"></td></tr>
            ${row('Total', money(total, currency), true)}
          </table>
        </div>

        ${providerBlock}

        <div style="border-top:1px solid #eef1ef;margin-top:20px;padding-top:16px;text-align:center;">
          <div style="font-size:12px;color:#5b6b63;">Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};text-decoration:none;font-weight:600;">${SUPPORT_EMAIL}</a></div>
          <div style="font-size:12px;color:#8a978f;margin-top:8px;">Natural Intellects · Kampala, Uganda</div>
        </div>
      </div>
    </div>
  </div>
</body></html>`;
}

export function receiptEmailSubject(receipt: Receipt): string {
  return `Your Smart Ride receipt · ${receipt.receiptNumber}`;
}
