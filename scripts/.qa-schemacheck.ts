import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const cols: any[] = await db.$queryRawUnsafe(
  `SELECT column_name, data_type, is_nullable FROM information_schema.columns
   WHERE table_name='Payment' AND column_name IN ('providerOrderId','orderId','taskId') ORDER BY column_name`);
console.log('Payment columns:', JSON.stringify(cols));
const fks: any[] = await db.$queryRawUnsafe(
  `SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS refs
   FROM information_schema.table_constraints tc
   JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name
   JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name=ccu.constraint_name
   WHERE tc.table_name='Payment' AND tc.constraint_type='FOREIGN KEY'`);
console.log('Payment FKs:', JSON.stringify(fks));
const idx: any[] = await db.$queryRawUnsafe(
  `SELECT indexname FROM pg_indexes WHERE tablename='Payment' AND indexname LIKE '%providerOrder%'`);
console.log('Payment indexes:', JSON.stringify(idx));
// prove a write works
console.log('providerOrder payments readable:', await db.payment.count({ where: { providerOrderId: { not: null } } }));
await db.$disconnect();
