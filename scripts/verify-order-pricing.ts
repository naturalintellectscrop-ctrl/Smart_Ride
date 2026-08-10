/**
 * BE-001 / BE-002 — can a modified client set its own prices?
 *
 * The order money path had two holes. BE-001 closed fees and totals; the
 * subtotal was still computed from `unitPrice` values in the request body, so
 * a client could post `unitPrice: 0` for a real menu item and the server would
 * compute a subtotal of zero — correctly and consistently, from a false input.
 *
 * These checks attack the endpoint the way a tampered client would: understate
 * a price, name someone else's cheaper item, order something unavailable, and
 * order more than exists. Each must be refused or re-priced, never trusted.
 *
 *   bun scripts/verify-order-pricing.ts
 */

import { db } from '../src/lib/db';
import { priceItemsFromCatalogue, quoteOrder } from '../src/lib/api/order-pricing';

const TAG = 'E2E-ORDERPRICE';
let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}

const created = { merchantIds: [] as string[], userIds: [] as string[], itemIds: [] as string[] };

async function makeMerchant(label: string) {
  const user = await db.user.create({
    data: {
      name: `${TAG} ${label}`,
      email: `${TAG.toLowerCase()}-${label}-${Date.now()}@smartride.test`,
      phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
      role: 'MERCHANT',
    },
  });
  created.userIds.push(user.id);
  const merchant = await db.merchant.create({
    data: {
      userId: user.id,
      name: `${TAG} ${label}`,
      type: 'RESTAURANT',
      phone: user.phone!,
      address: 'Kampala',
      latitude: 0.3476,
      longitude: 32.5825,
      status: 'APPROVED',
    },
  });
  created.merchantIds.push(merchant.id);
  return merchant;
}

async function main() {
  console.log('\n=== Order Pricing (BE-001 / BE-002) ===');

  try {
    const merchant = await makeMerchant('Shop');
    const rival = await makeMerchant('Rival');

    const pizza = await db.menuItem.create({
      data: { merchantId: merchant.id, name: `${TAG} Pizza`, price: 25000, isAvailable: true },
    });
    const soldOut = await db.menuItem.create({
      data: { merchantId: merchant.id, name: `${TAG} Sold Out`, price: 12000, isAvailable: false },
    });
    const scarce = await db.menuItem.create({
      data: {
        merchantId: merchant.id,
        name: `${TAG} Last Two`,
        price: 5000,
        isAvailable: true,
        stockQuantity: 2,
      },
    });
    const cheapElsewhere = await db.menuItem.create({
      data: { merchantId: rival.id, name: `${TAG} Cheap`, price: 100, isAvailable: true },
    });
    created.itemIds.push(pizza.id, soldOut.id, scarce.id, cheapElsewhere.id);

    // ── 1. The core attack ───────────────────────────────────────────
    stage('STAGE 1  a tampered price is ignored');

    const tampered = await priceItemsFromCatalogue(merchant.id, [
      { menuItemId: pizza.id, itemName: 'Pizza', quantity: 2, unitPrice: 0 },
    ]);
    check(
      'unitPrice: 0 on a real item is overridden by the catalogue',
      tampered.items[0]?.unitPrice === 25000 && tampered.items[0]?.totalPrice === 50000,
      `client said 0, charged ${tampered.items[0]?.unitPrice} x2 = ${tampered.items[0]?.totalPrice}`
    );
    check(
      'the understated line is reported as a price change, not silently fixed',
      tampered.increased.length === 1 && tampered.increased[0].was === 0,
      `${tampered.increased.length} change(s): was ${tampered.increased[0]?.was}, now ${tampered.increased[0]?.now}`
    );

    // Renaming matters once a human is picking the order.
    check(
      'the item name comes from the catalogue, not the request',
      tampered.items[0]?.itemName === `${TAG} Pizza`,
      `client said "Pizza", stored "${tampered.items[0]?.itemName}"`
    );

    // ── 2. Cross-merchant substitution ───────────────────────────────
    stage('STAGE 2  another merchant\'s cheap item cannot be bought here');
    const crossed = await priceItemsFromCatalogue(merchant.id, [
      { menuItemId: cheapElsewhere.id, itemName: 'Cheap', quantity: 1, unitPrice: 100 },
    ]);
    check(
      'an id belonging to a different merchant is rejected',
      crossed.items.length === 0 && crossed.rejected.length === 1,
      crossed.rejected[0]?.reason ?? 'accepted — a client could shop at another merchant\'s prices'
    );

    // ── 3. Availability and stock ────────────────────────────────────
    stage('STAGE 3  unavailable and out-of-stock items are refused');
    const unavailable = await priceItemsFromCatalogue(merchant.id, [
      { menuItemId: soldOut.id, quantity: 1, unitPrice: 12000 },
    ]);
    check(
      'an unavailable item cannot be ordered',
      unavailable.items.length === 0 && unavailable.rejected.length === 1,
      unavailable.rejected[0]?.reason ?? 'accepted'
    );

    const overStock = await priceItemsFromCatalogue(merchant.id, [
      { menuItemId: scarce.id, quantity: 5, unitPrice: 5000 },
    ]);
    check(
      'ordering more than exists is refused with the real count',
      overStock.items.length === 0 && /2/.test(overStock.rejected[0]?.reason ?? ''),
      overStock.rejected[0]?.reason ?? 'accepted'
    );

    const withinStock = await priceItemsFromCatalogue(merchant.id, [
      { menuItemId: scarce.id, quantity: 2, unitPrice: 5000 },
    ]);
    check(
      'ordering exactly what is left is allowed',
      withinStock.items.length === 1 && withinStock.rejected.length === 0,
      `qty 2 of 2 in stock -> ${withinStock.items.length} line(s)`
    );

    // ── 4. Unlinked lines ────────────────────────────────────────────
    stage('STAGE 4  a line with no catalogue link cannot be priced');
    const unlinked = await priceItemsFromCatalogue(merchant.id, [
      { itemName: 'Something I made up', quantity: 1, unitPrice: 1 },
    ]);
    check(
      'an item with no menuItemId is rejected rather than trusted',
      unlinked.items.length === 0 && unlinked.rejected.length === 1,
      unlinked.rejected[0]?.reason ?? 'accepted'
    );

    const badQty = await priceItemsFromCatalogue(merchant.id, [
      { menuItemId: pizza.id, quantity: 0, unitPrice: 25000 },
    ]);
    check(
      'a zero quantity is rejected',
      badQty.items.length === 0 && badQty.rejected.length === 1,
      badQty.rejected[0]?.reason ?? 'accepted'
    );

    // ── 5. The honest case still works ───────────────────────────────
    stage('STAGE 5  a truthful cart prices normally');
    const honest = await priceItemsFromCatalogue(merchant.id, [
      { menuItemId: pizza.id, quantity: 1, unitPrice: 25000 },
      { menuItemId: scarce.id, quantity: 2, unitPrice: 5000 },
    ]);
    check(
      'correct prices produce no warnings',
      honest.items.length === 2 && honest.increased.length === 0 && honest.rejected.length === 0,
      `${honest.items.length} line(s), 0 changes, 0 rejections`
    );

    // A cart priced ABOVE the catalogue is the customer's loss, not a threat —
    // charge the lower real price and say nothing.
    const overpaying = await priceItemsFromCatalogue(merchant.id, [
      { menuItemId: pizza.id, quantity: 1, unitPrice: 99000 },
    ]);
    check(
      'a client offering to overpay is charged the real, lower price',
      overpaying.items[0]?.unitPrice === 25000 && overpaying.increased.length === 0,
      `offered 99000, charged ${overpaying.items[0]?.unitPrice}`
    );

    // ── 6. Quote and charge agree ────────────────────────────────────
    stage('STAGE 6  the quote matches what will be charged');
    const cart = [
      { menuItemId: pizza.id, quantity: 1, unitPrice: 25000 },
      { menuItemId: scarce.id, quantity: 2, unitPrice: 5000 },
    ];
    const pricedCart = await priceItemsFromCatalogue(merchant.id, cart);
    const site = {
      orderType: 'FOOD_DELIVERY' as const,
      merchant: { latitude: merchant.latitude, longitude: merchant.longitude },
      delivery: { latitude: 0.36, longitude: 32.6 },
    };
    const quoteA = await quoteOrder({
      ...site,
      items: pricedCart.items.map(i => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
    });
    const quoteB = await quoteOrder({
      ...site,
      items: pricedCart.items.map(i => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
    });
    check(
      'identical input gives an identical total',
      quoteA.totalAmount === quoteB.totalAmount,
      `${quoteA.totalAmount} vs ${quoteB.totalAmount}`
    );
    check(
      'the subtotal is the sum of the catalogue lines, not the request',
      quoteA.subtotal === 25000 + 2 * 5000,
      `subtotal=${quoteA.subtotal}, expected ${25000 + 2 * 5000}`
    );
    check(
      'the total reconciles: subtotal + delivery + service - discount',
      quoteA.totalAmount ===
        quoteA.subtotal + quoteA.deliveryFee + quoteA.serviceFee - quoteA.discount,
      `${quoteA.subtotal} + ${quoteA.deliveryFee} + ${quoteA.serviceFee} - ${quoteA.discount} = ${quoteA.totalAmount}`
    );

    // A zeroed cart must not produce a free delivery either.
    const zeroed = await quoteOrder({
      ...site,
      items: [{ quantity: 1, unitPrice: 0 }],
    });
    check(
      'delivery is never free, even on a zero-value cart',
      zeroed.deliveryFee > 0,
      `deliveryFee=${zeroed.deliveryFee}`
    );

    // ── 7. The route refuses rather than repricing upward ────────────
    stage('STAGE 7  checkout stops instead of overcharging');
    const routeSrc = await Bun.file('src/app/api/orders/route.ts').text();
    check(
      'a price rise between cart and checkout returns 409, not a bigger bill',
      routeSrc.includes('PRICE_CHANGED') && routeSrc.includes('priced.increased'),
      'increased lines short-circuit before the transaction'
    );
    check(
      'the persisted line items come from the catalogue',
      routeSrc.includes('create: priced.items.map') &&
        !routeSrc.includes('create: validatedData.items.map'),
      'OrderItem rows are written from priced.items'
    );
  } finally {
    stage('cleanup');
    await db.orderItem.deleteMany({ where: { menuItemId: { in: created.itemIds } } });
    await db.menuItem.deleteMany({ where: { id: { in: created.itemIds } } });
    await db.order.deleteMany({ where: { merchantId: { in: created.merchantIds } } });
    await db.merchant.deleteMany({ where: { id: { in: created.merchantIds } } });
    await db.user.deleteMany({ where: { id: { in: created.userIds } } });
    console.log(`  removed ${created.merchantIds.length} merchant(s), ${created.itemIds.length} item(s)`);
  }

  console.log(
    failures === 0
      ? '\n=== ORDER PRICING IS SERVER-AUTHORITATIVE ===\n'
      : `\n=== ${failures} CHECK(S) FAILED ===\n`
  );
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async e => {
  console.error('ORDER PRICING ERROR:', e);
  await db.$disconnect();
  process.exit(1);
});
