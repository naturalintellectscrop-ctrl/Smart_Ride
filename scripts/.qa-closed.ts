import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const API = 'https://smartrideug.vercel.app/api';
const db = new PrismaClient();

const login = async (email: string, password: string) => {
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const j: any = await r.json();
  return j?.data?.accessToken ?? j?.accessToken ?? null;
};

async function main() {
  const state = JSON.parse(require('fs').readFileSync('scripts/.qa-pharm-chain.json', 'utf8'));
  const rand = Math.random().toString(36).slice(2, 8);
  const email = `qa-pchain-cust-${rand}@qa.invalid`;
  const cust = await db.user.create({
    data: { email, phone: `+2567${Math.floor(Math.random() * 90000000 + 10000000)}`, name: 'QA Closed Test', passwordHash: await bcrypt.hash('QaChain#2026', 10), role: 'CLIENT', status: 'ACTIVE' },
  });
  const pt = await login(state.pharmEmail, state.pharmPass);
  const ct = await login(email, 'QaChain#2026');
  const call = async (t: string, p: string, m = 'GET', b?: unknown) => {
    const r = await fetch(`${API}${p}`, { method: m, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, ...(b ? { body: JSON.stringify(b) } : {}) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const order = () => call(ct!, '/health-provider/orders', 'POST', {
    providerId: state.providerId, customerId: cust.id, orderType: 'OTC_MEDICINE',
    items: JSON.stringify([{ name: 'Paracetamol', price: 4000, quantity: 1 }]),
    deliveryAddress: 'Ntinda, Kampala', deliveryLatitude: 0.3626, deliveryLongitude: 32.6111, paymentMethod: 'CASH',
  });

  await call(pt!, '/health-provider/status', 'PATCH', { isOpen: false });
  const blocked = await order();
  console.log(`closed  -> HTTP ${blocked.status}  ${blocked.json?.error ?? ''}`);

  await call(pt!, '/health-provider/status', 'PATCH', { isOpen: true });
  const allowed = await order();
  console.log(`open    -> HTTP ${allowed.status}  order=${allowed.json?.order?.orderNumber ?? allowed.json?.error ?? ''}`);

  const live = allowed.json?.order?.id;
  if (live) {
    await call(pt!, '/health-provider/status', 'PATCH', { isOpen: false });
    const still = await db.providerOrder.findUnique({ where: { id: live } });
    console.log(`existing order after closing -> ${still?.status}`);
    await call(pt!, '/health-provider/status', 'PATCH', { isOpen: true });
    await db.auditLog.deleteMany({ where: { userId: cust.id } }).catch(() => {});
    await db.providerOrder.delete({ where: { id: live } }).catch(() => {});
  }
  await db.auditLog.deleteMany({ where: { userId: cust.id } }).catch(() => {});
  await db.user.delete({ where: { id: cust.id } }).catch(() => {});
  await db.$disconnect();
}
main().catch(async (e) => { console.error(e); await db.$disconnect(); });
