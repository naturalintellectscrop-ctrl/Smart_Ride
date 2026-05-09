/**
 * Database Migration: Railway → Render
 * Using node-postgres (pg) for direct SQL operations
 */

const { Client } = require('pg');

const RAILWAY_URL = "postgresql://postgres:yGphbfshRKrZSMLNPGCwJXGckrTOalVL@maglev.proxy.rlwy.net:55740/railway";
const RENDER_URL = "postgresql://smart_ride_db_user:UVJ2Gd3Nn4BWnQhyXqMIFrNMHJJUThBQ@dpg-d7ficoreo5us73eu1oi0-a.frankfurt-postgres.render.com/smart_ride_db";

// Tables in dependency order
const TABLES = [
  'User', 'Session', 'OTP', 'Rider', 'Vehicle', 'Merchant', 'Pharmacy',
  'MenuItem', 'HealthProvider', 'ProviderDocument', 'MedicineCatalog',
  'Prescription', 'Order', 'OrderItem', 'KOT', 'HealthOrder',
  'HealthOrderItem', 'PharmacyOrderTicket', 'PrescriptionAccessLog',
  'ProviderOrder', 'Task', 'Payment', 'RiderPayout', 'CashCollection',
  'FinanceLog', 'Rating', 'AuditLog', 'Notification', 'SOSAlert',
  'SystemConfig', 'SLAConfig', 'PricingConfig', 'HeartbeatLog',
  'ConnectionAlert', 'FraudAlert', 'ApiRateLimit', 'Conversation',
  'ConversationParticipant', 'Message', 'Document'
];

async function migrate() {
  console.log('🚀 Starting Database Migration: Railway → Render');
  console.log('='.repeat(60));
  
  const source = new Client({ connectionString: RAILWAY_URL, ssl: { rejectUnauthorized: false } });
  const target = new Client({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });
  
  try {
    // Connect
    console.log('\n🔌 Connecting to databases...');
    await source.connect();
    console.log('  ✅ Connected to Railway');
    await target.connect();
    console.log('  ✅ Connected to Render');
    
    // Analyze source
    console.log('\n📊 Analyzing source database...');
    const stats = [];
    
    for (const table of TABLES) {
      try {
        const res = await source.query(`SELECT COUNT(*) FROM "${table}"`);
        const count = parseInt(res.rows[0].count);
        stats.push({ table, count });
        if (count > 0) console.log(`  ${table}: ${count} records`);
      } catch (e) {
        stats.push({ table, count: 0, error: true });
      }
    }
    
    // Migrate each table
    console.log('\n📦 Migrating data...');
    const results = [];
    
    for (const { table, count, error } of stats) {
      if (error || count === 0) {
        console.log(`  ⏭️  Skipping ${table}`);
        results.push({ table, status: 'skipped' });
        continue;
      }
      
      try {
        // Get column info
        const colRes = await source.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
        `, [table]);
        const columns = colRes.rows.map(r => r.column_name);
        
        // Fetch all data
        const dataRes = await source.query(`SELECT * FROM "${table}"`);
        const rows = dataRes.rows;
        
        if (rows.length === 0) {
          results.push({ table, status: 'empty' });
          continue;
        }
        
        // Insert into target
        let inserted = 0;
        const colList = columns.map(c => `"${c}"`).join(', ');
        
        for (const row of rows) {
          const values = columns.map(col => {
            const val = row[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'string') {
              return `'${val.replace(/'/g, "''").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
            }
            if (val instanceof Date) {
              return `'${val.toISOString()}'`;
            }
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
            if (typeof val === 'object') {
              return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            }
            return String(val);
          });
          
          const sql = `INSERT INTO "${table}" (${colList}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING`;
          
          try {
            await target.query(sql);
            inserted++;
          } catch (insertErr) {
            // Log first error only per table
            if (inserted === 0) {
              console.log(`    ⚠️  Insert error: ${insertErr.message.substring(0, 100)}`);
            }
          }
        }
        
        console.log(`  ✅ ${table}: ${inserted}/${rows.length} records`);
        results.push({ table, status: 'migrated', inserted, total: rows.length });
        
      } catch (err) {
        console.log(`  ❌ ${table}: ${err.message.substring(0, 100)}`);
        results.push({ table, status: 'error', error: err.message });
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    
    const migrated = results.filter(r => r.status === 'migrated');
    const skipped = results.filter(r => r.status === 'skipped' || r.status === 'empty');
    const errors = results.filter(r => r.status === 'error');
    
    console.log(`✅ Migrated: ${migrated.length} tables (${migrated.reduce((a, b) => a + (b.inserted || 0), 0)} records)`);
    console.log(`⏭️  Skipped: ${skipped.length} tables`);
    console.log(`❌ Errors: ${errors.length} tables`);
    
    if (errors.length > 0) {
      console.log('\nError details:');
      errors.forEach(e => console.log(`  - ${e.table}: ${e.error?.substring(0, 80)}`));
    }
    
    // Verify counts
    console.log('\n🔍 Verification:');
    for (const m of migrated.slice(0, 5)) {
      try {
        const countRes = await target.query(`SELECT COUNT(*) FROM "${m.table}"`);
        const targetCount = parseInt(countRes.rows[0].count);
        console.log(`  ${m.table}: source=${m.total}, target=${targetCount}`);
      } catch (e) {}
    }
    
    console.log('\n🎉 Migration complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await source.end().catch(() => {});
    await target.end().catch(() => {});
  }
}

migrate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
