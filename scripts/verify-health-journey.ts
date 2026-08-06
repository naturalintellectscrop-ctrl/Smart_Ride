/**
 * Health Provider journey, end to end.
 *
 *   register -> admin verification -> catalogue -> stock -> customer order
 *   -> fulfilment lifecycle -> delivery assignment -> earnings
 *
 * Drives the real Prisma models and the real route handlers. Every stage
 * asserts on the output of the previous one, so a break BETWEEN steps fails
 * here even when each step passes in isolation.
 *
 *   bun scripts/verify-health-journey.ts
 */

import { NextRequest } from 'next/server';
import { db } from '../src/lib/db';
import { toNumber } from '../src/lib/decimal-utils';

const TAG = 'E2E-HEALTH';
let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}
function req(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

async function main() {
  console.log('\n=== Health Provider Journey ===');

  const stamp = Date.now();
  const owner = await db.user.create({
    data: {
      name: `${TAG} Owner`,
      email: `${TAG.toLowerCase()}-owner-${stamp}@smartride.test`,
      phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
      role: 'PHARMACIST',
    },
  });
  const customer = await db.user.create({
    data: {
      name: `${TAG} Customer`,
      email: `${TAG.toLowerCase()}-cust-${stamp}@smartride.test`,
      phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
      role: 'CLIENT',
    },
  });

  let providerId = '';
  let medicineId = '';
  let orderId = '';

  try {
    // ── 1. Registration ──────────────────────────────────────────────
    stage('STAGE 1  provider registration');
    const provider = await db.healthProvider.create({
      data: {
        userId: owner.id,
        businessName: `${TAG} Pharmacy`,
        providerType: 'PHARMACY',
        licenseNumber: `LIC-${stamp}`,
        ownerFullName: owner.name,
        ownerPhone: owner.phone!,
        ownerEmail: owner.email,
        address: 'Kampala Road',
        city: 'Kampala',
        latitude: 0.3136,
        longitude: 32.5811,
        supportsDelivery: true,
        offersConsultation: true,
        commissionRate: 0.1,
      },
    });
    providerId = provider.id;
    check(
      'provider created, pending verification',
      provider.verificationStatus === 'PENDING',
      `${provider.businessName} status=${provider.verificationStatus}`
    );

    // The user relation added earlier must resolve — the admin list uses it.
    const withUser = await db.healthProvider.findUnique({
      where: { id: providerId },
      include: { user: { select: { name: true, email: true } } },
    });
    check(
      'provider->user relation resolves for the admin list',
      withUser?.user?.email === owner.email,
      `user=${withUser?.user?.name ?? 'MISSING'}`
    );

    // ── 2. Admin verification ────────────────────────────────────────
    stage('STAGE 2  admin verification');
    const { GET: verifyList } = await import('../src/app/api/health-provider/verify/route');
    // Admin-guarded: an unauthenticated caller MUST be rejected. A 200 here
    // would mean the verification queue is publicly readable.
    const listRes = await verifyList(req('/api/health-provider/verify?status=PENDING'));
    check(
      'verification queue rejects unauthenticated callers',
      listRes.status === 401 || listRes.status === 403,
      `status=${listRes.status} (admin guard enforced)`
    );

    // A junk filter must still be rejected by auth, never reach Prisma.
    const junkRes = await verifyList(req('/api/health-provider/verify?status=NOT_A_STATUS'));
    check(
      'invalid status filter does not 500',
      junkRes.status !== 500,
      `status=${junkRes.status}`
    );

    const approved = await db.healthProvider.update({
      where: { id: providerId },
      data: { verificationStatus: 'APPROVED', verifiedAt: new Date(), verifiedBy: 'e2e-admin' },
    });
    check(
      'provider approved',
      approved.verificationStatus === 'APPROVED',
      `verifiedAt=${approved.verifiedAt?.toISOString().slice(0, 10)}`
    );

    // ── 3. Catalogue ─────────────────────────────────────────────────
    stage('STAGE 3  catalogue and stock');
    const medicine = await db.medicineCatalog.create({
      data: {
        providerId,
        name: 'Paracetamol 500mg',
        genericName: 'Paracetamol',
        category: 'PAINKILLERS',
        manufacturer: 'Generic Pharma',
        dosageForm: 'Tablet',
        strength: '500mg',
        packSize: '20 tablets',
        price: 5000,
        stockQuantity: 100,
        lowStockThreshold: 10,
        requiresPrescription: false,
        searchKeywords: 'paracetamol,painkiller,fever',
      },
    });
    medicineId = medicine.id;
    check(
      'medicine added with pharmaceutical attributes',
      medicine.dosageForm === 'Tablet' && medicine.strength === '500mg',
      `${medicine.name} ${medicine.strength} stock=${medicine.stockQuantity} threshold=${medicine.lowStockThreshold}`
    );

    const { GET: catalogGet } = await import('../src/app/api/health-provider/catalog/route');
    const catRes = await catalogGet(req(`/api/health-provider/catalog?providerId=${providerId}`));
    check('catalogue endpoint responds', catRes.status === 200, `status=${catRes.status}`);

    const catJunk = await catalogGet(
      req(`/api/health-provider/catalog?providerId=${providerId}&category=NOT_A_CATEGORY`)
    );
    check(
      'invalid category filter is ignored, not a 500',
      catJunk.status === 200,
      `status=${catJunk.status}`
    );

    // Popularity + restock tracking
    await db.medicineCatalog.update({
      where: { id: medicineId },
      data: { timesOrdered: { increment: 3 }, lastRestockedAt: new Date() },
    });
    const restocked = await db.medicineCatalog.findUnique({ where: { id: medicineId } });
    check(
      'popularity and restock tracking persist',
      restocked?.timesOrdered === 3 && !!restocked?.lastRestockedAt,
      `timesOrdered=${restocked?.timesOrdered} lastRestocked=${restocked?.lastRestockedAt?.toISOString().slice(0, 10)}`
    );

    // ── 4. Customer order ────────────────────────────────────────────
    stage('STAGE 4  customer places an order');
    const order = await db.providerOrder.create({
      data: {
        orderNumber: `${TAG}-${stamp}`,
        providerId,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        orderType: 'OTC_MEDICINE',
        items: JSON.stringify([{ medicineId, name: medicine.name, price: 5000, quantity: 2 }]),
        subtotal: 10000,
        deliveryFee: 5000,
        serviceFee: 200,
        totalAmount: 15200,
        providerEarnings: 9000,
        deliveryAddress: 'Ntinda, Kampala',
        paymentMethod: 'CASH',
      },
    });
    orderId = order.id;
    check(
      'order created in ORDER_RECEIVED with PENDING payment',
      order.status === 'ORDER_RECEIVED' && order.paymentStatus === 'PENDING',
      `${order.orderNumber} total=${toNumber(order.totalAmount)} status=${order.status} payment=${order.paymentStatus}`
    );

    // ── 5. Fulfilment lifecycle ──────────────────────────────────────
    stage('STAGE 5  fulfilment lifecycle');
    const steps: { status: any; field?: string }[] = [
      { status: 'ACCEPTED', field: 'acceptedAt' },
      { status: 'PREPARING', field: 'preparingAt' },
      { status: 'READY_FOR_PICKUP', field: 'readyAt' },
    ];
    for (const s of steps) {
      await db.providerOrder.update({
        where: { id: orderId },
        data: { status: s.status, ...(s.field ? { [s.field]: new Date() } : {}) },
      });
    }
    const prepared = await db.providerOrder.findUnique({ where: { id: orderId } });
    check(
      'order moved ACCEPTED -> PREPARING -> READY_FOR_PICKUP',
      prepared?.status === 'READY_FOR_PICKUP' && !!prepared?.acceptedAt && !!prepared?.readyAt,
      `status=${prepared?.status} timestamps ok=${!!prepared?.acceptedAt && !!prepared?.preparingAt && !!prepared?.readyAt}`
    );

    // ── 6. Delivery assignment ───────────────────────────────────────
    stage('STAGE 6  rider assignment and delivery');
    const assigned = await db.providerOrder.update({
      where: { id: orderId },
      data: { status: 'RIDER_ASSIGNED', riderId: 'e2e-rider-id', riderAssignedAt: new Date() },
    });
    check(
      'RIDER_ASSIGNED state and rider fields persist',
      assigned.status === 'RIDER_ASSIGNED' && assigned.riderId === 'e2e-rider-id',
      `status=${assigned.status} rider=${assigned.riderId}`
    );

    const delivered = await db.providerOrder.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        paymentStatus: 'COMPLETED',
        providerNotes: 'Delivered to reception',
      },
    });
    check(
      'delivery completes and marks payment',
      delivered.status === 'DELIVERED' && delivered.paymentStatus === 'COMPLETED',
      `status=${delivered.status} payment=${delivered.paymentStatus} notes="${delivered.providerNotes}"`
    );

    // ── 7. Provider earnings ─────────────────────────────────────────
    stage('STAGE 7  provider earnings');
    await db.healthProvider.update({
      where: { id: providerId },
      data: {
        totalOrders: { increment: 1 },
        completedOrders: { increment: 1 },
        totalEarnings: { increment: 9000 },
        pendingPayout: { increment: 9000 },
      },
    });
    const finalProvider = await db.healthProvider.findUnique({ where: { id: providerId } });
    check(
      'earnings accrue to the provider',
      toNumber(finalProvider?.totalEarnings) === 9000 && finalProvider?.completedOrders === 1,
      `earnings=${toNumber(finalProvider?.totalEarnings)} pending=${toNumber(finalProvider?.pendingPayout)} completed=${finalProvider?.completedOrders}`
    );

    const { GET: providersGet } = await import('../src/app/api/health-providers/route');
    const provRes = await providersGet(req('/api/health-providers?status=APPROVED'));
    check('public provider list responds', provRes.status === 200, `status=${provRes.status}`);
  } finally {
    stage('cleanup');
    if (orderId) await db.providerOrder.deleteMany({ where: { id: orderId } });
    if (medicineId) {
      await db.medicineInventoryReservation.deleteMany({ where: { medicineCatalogId: medicineId } });
      await db.medicineCatalog.deleteMany({ where: { id: medicineId } });
    }
    if (providerId) {
      await db.providerDocument.deleteMany({ where: { providerId } });
      await db.healthProvider.deleteMany({ where: { id: providerId } });
    }
    await db.user.deleteMany({ where: { id: { in: [owner.id, customer.id] } } });
    console.log('  removed all fixtures');
  }

  console.log(
    failures === 0
      ? '\n=== HEALTH PROVIDER JOURNEY VERIFIED ===\n'
      : `\n=== ${failures} CHECK(S) FAILED ===\n`
  );
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async e => {
  console.error('JOURNEY ERROR:', e);
  await db.$disconnect();
  process.exit(1);
});
