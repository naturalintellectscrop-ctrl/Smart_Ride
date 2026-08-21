/**
 * Merchant and pharmacist journey fixtures for physical-device QA. Temporary.
 *
 *   bun scripts/.qa-merchant.ts setup    — merchant + pharmacist accounts, one order each
 *   bun scripts/.qa-merchant.ts state    — authoritative state of both orders
 *   bun scripts/.qa-merchant.ts cleanup  — remove everything, verify
 *
 * Both accounts get a known password so they can be signed in ON THE PHONE.
 */

import { db, setServiceRoleContext } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth/password';
import fs from 'fs';

const PASSWORD = 'ProbePass@2026!';
const STATE = 'C:/Users/GODWIN/AppData/Local/Temp/claude/c--Smart-Ride/799958f2-f0b4-4e0a-9c1d-f3ba52909f98/scratchpad/merchant.json';

type S = {
  merchantEmail?: string; merchantId?: string; merchantUserId?: string; orderId?: string; orderNumber?: string;
  pharmEmail?: string; providerId?: string; pharmUserId?: string; healthOrderId?: string; healthOrderNumber?: string;
  clientId?: string;
};
const load = (): S => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {});
const save = (s: S) => fs.writeFileSync(STATE, JSON.stringify(s, null, 1));

const stamp = Date.now();

async function main() {
  const cmd = process.argv[2] ?? 'state';
  await setServiceRoleContext();
  const s = load();

  if (cmd === 'setup') {
    // A customer to place both orders.
    const client = await db.user.create({
      data: {
        email: `qa-mp-client-${stamp}@smartride.test`,
        name: 'QA MP Client',
        phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
        passwordHash: await hashPassword(PASSWORD),
        role: 'CLIENT',
      },
    });

    // ── MERCHANT ──
    const mEmail = `qa-merchant-${stamp}@smartride.test`;
    const mUser = await db.user.create({
      data: {
        email: mEmail, name: 'QA Kitchen Owner',
        phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
        passwordHash: await hashPassword(PASSWORD), role: 'MERCHANT',
      },
    });
    const merchant = await db.merchant.create({
      data: {
        userId: mUser.id, name: 'QA Kitchen', type: 'RESTAURANT',
        phone: mUser.phone!, address: 'Bugolobi, Kampala',
        latitude: 0.3176, longitude: 32.6103, isOpen: true,
      } as never,
    });
    const order = await db.order.create({
      data: {
        orderNumber: `QA-ORD-${stamp}`,
        clientId: client.id, merchantId: merchant.id,
        orderType: 'FOOD_DELIVERY', status: 'ORDER_CREATED',
        subtotal: 20000, deliveryFee: 3000, totalAmount: 23000,
        paymentMethod: 'CASH', deliveryAddress: 'MUBS, Nakawa',
      } as never,
    });

    // ── PHARMACIST ──
    const pEmail = `qa-pharmacist-${stamp}@smartride.test`;
    const pUser = await db.user.create({
      data: {
        email: pEmail, name: 'QA Pharmacist',
        phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
        passwordHash: await hashPassword(PASSWORD), role: 'PHARMACIST',
      },
    });
    const provider = await db.healthProvider.create({
      data: {
        userId: pUser.id, businessName: 'QA Pharmacy',
        licenseNumber: `LIC-${stamp}`, ownerFullName: 'QA Owner',
        ownerPhone: pUser.phone!, providerType: 'PHARMACY',
        address: 'Bugolobi, Kampala',
      } as never,
    });
    // ProviderOrder — the model the pharmacist's own order list reads. NOT
    // HealthOrder, which is a different table behind a different route.
    const hOrder = await db.providerOrder.create({
      data: {
        orderNumber: `QA-HORD-${stamp}`,
        customerId: client.id, providerId: provider.id,
        orderType: 'OTC_MEDICINE',
        items: JSON.stringify([{ name: 'Paracetamol 500mg', qty: 2, price: 7500 }]),
        status: 'ORDER_RECEIVED',
        subtotal: 15000, deliveryFee: 2000, totalAmount: 17000,
        providerEarnings: 13000, deliveryAddress: 'MUBS, Nakawa',
      } as never,
    });

    save({
      merchantEmail: mEmail, merchantId: merchant.id, merchantUserId: mUser.id,
      orderId: order.id, orderNumber: order.orderNumber,
      pharmEmail: pEmail, providerId: provider.id, pharmUserId: pUser.id,
      healthOrderId: hOrder.id, healthOrderNumber: hOrder.orderNumber,
      clientId: client.id,
    });

    console.log(`MERCHANT   ${mEmail} / ${PASSWORD}`);
    console.log(`           ${merchant.name} — order ${order.orderNumber} (${order.status}) UGX ${Number(order.totalAmount)}`);
    console.log(`PHARMACIST ${pEmail} / ${PASSWORD}`);
    console.log(`           ${provider.businessName} — order ${hOrder.orderNumber} (${hOrder.status}) UGX ${Number(hOrder.totalAmount)}`);
    console.log(`CLIENT     ${client.email} (placed both)`);
    return;
  }

  if (cmd === 'state') {
    const o = await db.order.findUnique({
      where: { id: s.orderId! },
      select: { orderNumber: true, status: true, paymentStatus: true, totalAmount: true, acceptedAt: true, readyAt: true },
    });
    console.log(`ORDER   ${o?.orderNumber} status=${o?.status} payment=${o?.paymentStatus} total=${Number(o?.totalAmount)}`);
    const h = await db.providerOrder.findUnique({
      where: { id: s.healthOrderId! },
      select: { orderNumber: true, status: true, totalAmount: true },
    });
    console.log(`HEALTH  ${h?.orderNumber} status=${h?.status} total=${Number(h?.totalAmount)}`);
    return;
  }

  if (cmd === 'cleanup') {
    const users = await db.user.findMany({
      where: { OR: [{ email: { startsWith: 'qa-merchant-' } }, { email: { startsWith: 'qa-pharmacist-' } }, { email: { startsWith: 'qa-mp-client-' } }] },
      select: { id: true },
    });
    const ids = users.map(u => u.id);
    const merchants = await db.merchant.findMany({ where: { userId: { in: ids } }, select: { id: true } });
    const providers = await db.healthProvider.findMany({ where: { userId: { in: ids } }, select: { id: true } });
    const orders = await db.order.findMany({ where: { clientId: { in: ids } }, select: { id: true, orderNumber: true, status: true } });
    const hOrders = await db.providerOrder.findMany({ where: { customerId: { in: ids } }, select: { id: true, orderNumber: true, status: true } });
    console.log(`cleaning ${users.length} user(s), ${orders.length} order(s), ${hOrders.length} health order(s)`);
    console.log(`  orders: ${orders.map(o => o.orderNumber + ':' + o.status).join(', ') || '(none)'}`);
    console.log(`  health: ${hOrders.map(o => o.orderNumber + ':' + o.status).join(', ') || '(none)'}`);

    const oids = orders.map(o => o.id);
    await db.kOT.deleteMany({ where: { orderId: { in: oids } } }).catch(() => {});
    await db.orderItem.deleteMany({ where: { orderId: { in: oids } } }).catch(() => {});
    await db.payment.deleteMany({ where: { orderId: { in: oids } } }).catch(() => {});
    await db.order.deleteMany({ where: { id: { in: oids } } }).catch(() => {});
    await db.providerOrder.deleteMany({ where: { id: { in: hOrders.map(o => o.id) } } }).catch(() => {});
    await db.healthProvider.deleteMany({ where: { id: { in: providers.map(p => p.id) } } }).catch(() => {});
    await db.merchant.deleteMany({ where: { id: { in: merchants.map(m => m.id) } } }).catch(() => {});
    await db.notification.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.user.deleteMany({ where: { id: { in: ids } } }).catch(() => {});

    const left = await db.user.count({
      where: { OR: [{ email: { startsWith: 'qa-merchant-' } }, { email: { startsWith: 'qa-pharmacist-' } }, { email: { startsWith: 'qa-mp-client-' } }] },
    });
    console.log(`VERIFY  leftover users=${left}`);
    if (fs.existsSync(STATE)) fs.unlinkSync(STATE);
    return;
  }

  console.log('unknown command');
}

main().finally(async () => {
  await db.$disconnect();
});
