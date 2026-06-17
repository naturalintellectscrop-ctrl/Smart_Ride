#!/usr/bin/env node
/**
 * Seed test merchants + menu items for flow validation.
 * Idempotent: skips if already exists.
 */
import pg from 'pg';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    // Approve all PENDING_APPROVAL merchants and open them
    const { rowCount: approved } = await pool.query(`
      UPDATE "Merchant"
      SET status = 'APPROVED', "isOpen" = true, "verifiedAt" = NOW()
      WHERE status = 'PENDING_APPROVAL'
    `);
    console.log(`Approved ${approved} pending merchants and opened them`);

    // Approve any pharmacies too (type=PHARMACY)
    const { rows: merchants } = await pool.query(`
      SELECT id, name, type FROM "Merchant" WHERE type IN ('RESTAURANT','GROCERY','PHARMACY','SUPERMARKET','RETAIL_STORE')
    `);
    console.log('Merchants in DB:');
    for (const m of merchants) {
      console.log(`  ${m.id} | ${m.type} | ${m.name}`);
    }

    // For each restaurant without menu items, create a few
    const { rows: restaurants } = await pool.query(`
      SELECT id, name FROM "Merchant" WHERE type = 'RESTAURANT' AND status = 'APPROVED'
    `);
    for (const r of restaurants) {
      const { rowCount: existing } = await pool.query(`SELECT id FROM "MenuItem" WHERE "merchantId" = $1 LIMIT 1`, [r.id]);
      if (existing && existing > 0) {
        console.log(`Restaurant ${r.name} already has menu items — skipping`);
        continue;
      }
      const items = [
        { name: 'Margherita Pizza', category: 'Main', price: 25000, desc: 'Classic cheese and tomato' },
        { name: 'Pepperoni Pizza', category: 'Main', price: 30000, desc: 'Pepperoni and cheese' },
        { name: 'Coca-Cola 500ml', category: 'Drinks', price: 3000, desc: 'Chilled soda' },
        { name: 'Caesar Salad', category: 'Starters', price: 12000, desc: 'Fresh greens with caesar dressing' },
      ];
      for (const item of items) {
        await pool.query(`
          INSERT INTO "MenuItem" (id, "merchantId", name, description, category, price, "isAvailable", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, NOW(), NOW())
        `, [r.id, item.name, item.desc, item.category, item.price]);
      }
      console.log(`Added ${items.length} menu items to ${r.name}`);
    }

    // For each GROCERY store without products, add some
    const { rows: groceries } = await pool.query(`
      SELECT id, name FROM "Merchant" WHERE type IN ('GROCERY','SUPERMARKET') AND status = 'APPROVED'
    `);
    for (const g of groceries) {
      const { rowCount: existing } = await pool.query(`SELECT id FROM "MenuItem" WHERE "merchantId" = $1 LIMIT 1`, [g.id]);
      if (existing && existing > 0) {
        console.log(`Grocery ${g.name} already has items — skipping`);
        continue;
      }
      const items = [
        { name: 'Rice 5kg', category: 'Grains', price: 18000, desc: 'Long grain parboiled rice' },
        { name: 'Cooking Oil 1L', category: 'Pantry', price: 6500, desc: 'Vegetable oil' },
        { name: 'Sugar 1kg', category: 'Pantry', price: 4500, desc: 'White granulated sugar' },
        { name: 'Milk 1L', category: 'Dairy', price: 3500, desc: 'Fresh pasteurized milk' },
      ];
      for (const item of items) {
        await pool.query(`
          INSERT INTO "MenuItem" (id, "merchantId", name, description, category, price, "isAvailable", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, NOW(), NOW())
        `, [g.id, item.name, item.desc, item.category, item.price]);
      }
      console.log(`Added ${items.length} items to grocery ${g.name}`);
    }

    // Create a Pharmacy row linked to any APPROVED PHARMACY merchant
    const { rows: pharmMerchants } = await pool.query(`
      SELECT id, name FROM "Merchant" WHERE type = 'PHARMACY' AND status = 'APPROVED'
    `);
    for (const p of pharmMerchants) {
      const { rowCount: existing } = await pool.query(`SELECT id FROM "Pharmacy" WHERE "merchantId" = $1`, [p.id]);
      if (existing && existing > 0) {
        console.log(`Pharmacy row already exists for ${p.name}`);
        continue;
      }
      await pool.query(`
        INSERT INTO "Pharmacy" (id, "merchantId", "pharmacyLicense", "pharmacistInCharge", "pharmacistLicense", status, "isOpen", "totalOrders", "rating", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, 'TEST-LIC-001', 'Test Pharmacist', 'TEST-PHARM-LIC-001', 'APPROVED', true, 0, 5, NOW(), NOW())
      `, [p.id]);
      console.log(`Created Pharmacy row for ${p.name}`);
    }

    // Add medicine-catalog items for any pharmacy
    const { rows: pharmacies } = await pool.query(`SELECT id FROM "Pharmacy" WHERE status = 'APPROVED'`);
    for (const p of pharmacies) {
      const { rowCount: existing } = await pool.query(`SELECT id FROM "MedicineCatalog" WHERE "pharmacyId" = $1 LIMIT 1`, [p.id]);
      if (existing && existing > 0) {
        console.log(`Pharmacy ${p.id} already has medicines — skipping`);
        continue;
      }
      const meds = [
        { name: 'Paracetamol 500mg (Strip of 10)', price: 2000, desc: 'Pain reliever', cat: 'PAINKILLERS', rx: false },
        { name: 'Amoxicillin 250mg (Strip of 10)', price: 5000, desc: 'Antibiotic', cat: 'ANTIBIOTICS', rx: true },
        { name: 'ORS Sachet', price: 1000, desc: 'Oral rehydration salts', cat: 'DIGESTIVE', rx: false },
        { name: 'Ibuprofen 200mg (Strip of 10)', price: 3000, desc: 'Anti-inflammatory', cat: 'PAINKILLERS', rx: false },
      ];
      for (const m of meds) {
        await pool.query(`
          INSERT INTO "MedicineCatalog" (id, "pharmacyId", name, description, category, price, "isAvailable", "requiresPrescription", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, $6, NOW(), NOW())
        `, [p.id, m.name, m.desc, m.cat, m.price, m.rx]);
      }
      console.log(`Added ${meds.length} medicines to pharmacy (id=${p.id})`);
    }

    console.log('\nDone');
  } catch (err) {
    console.error('FAILED:', err instanceof Error ? err.message : String(err));
    console.error(err instanceof Error ? err.stack : '');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
