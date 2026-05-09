/**
 * Database Migration Script: Railway → Render
 * 
 * This script migrates all data from Railway PostgreSQL to Render PostgreSQL
 * Using raw SQL for better performance and reliability
 */

const { PrismaClient } = require('@prisma/client');

// Database URLs
const RAILWAY_URL = "postgresql://postgres:yGphbfshRKrZSMLNPGCwJXGckrTOalVL@maglev.proxy.rlwy.net:55740/railway";
const RENDER_URL = "postgresql://smart_ride_db_user:UVJ2Gd3Nn4BWnQhyXqMIFrNMHJJUThBQ@dpg-d7ficoreo5us73eu1oi0-a.frankfurt-postgres.render.com/smart_ride_db";

// Table names to migrate (in order of foreign key dependencies)
const TABLES = [
  'User',
  'Session', 
  'OTP',
  'Rider',
  'Vehicle',
  'Merchant',
  'Pharmacy',
  'MenuItem',
  'HealthProvider',
  'ProviderDocument',
  'MedicineCatalog',
  'Prescription',
  '_prisma_migrations',
  'Order',
  'OrderItem',
  'KOT',
  'HealthOrder',
  'HealthOrderItem',
  'PharmacyOrderTicket',
  'PrescriptionAccessLog',
  'ProviderOrder',
  'Task',
  'Payment',
  'RiderPayout',
  'CashCollection',
  'FinanceLog',
  'Rating',
  'AuditLog',
  'Notification',
  'SOSAlert',
  'SystemConfig',
  'SLAConfig',
  'PricingConfig',
  'HeartbeatLog',
  'ConnectionAlert',
  'FraudAlert',
  'ApiRateLimit',
  'Conversation',
  'ConversationParticipant',
  'Message',
  'Document'
];

async function migrateWithPrismaClients() {
  console.log('🚀 Starting Database Migration: Railway → Render');
  console.log('='.repeat(60));
  
  // Create two Prisma instances
  const sourcePrisma = new PrismaClient({
    datasources: { db: { url: RAILWAY_URL } }
  });
  
  const targetPrisma = new PrismaClient({
    datasources: { db: { url: RENDER_URL } }
  });
  
  try {
    // Test connections
    console.log('\n🔌 Testing connections...');
    
    await sourcePrisma.$queryRaw`SELECT 1`;
    console.log('  ✅ Connected to Railway (source)');
    
    await targetPrisma.$queryRaw`SELECT 1`;
    console.log('  ✅ Connected to Render (target)');
    
    // Get table row counts from source
    console.log('\n📊 Analyzing source database...');
    const results = [];
    
    for (const table of TABLES) {
      try {
        const countResult = await sourcePrisma.$queryRawUnsafe(
          `SELECT COUNT(*) as count FROM "${table}"`
        );
        const count = Number(countResult[0]?.count || 0);
        console.log(`  ${table}: ${count} records`);
        results.push({ table, count, status: 'pending' });
      } catch (e) {
        // Table might not exist
        results.push({ table, count: 0, status: 'not_found' });
      }
    }
    
    // Migrate data table by table
    console.log('\n📦 Migrating data...');
    
    for (const item of results) {
      if (item.count === 0 || item.status === 'not_found') {
        console.log(`  ⏭️  Skipping ${item.table} (empty or not found)`);
        continue;
      }
      
      try {
        // Get all data from source table
        const rows = await sourcePrisma.$queryRawUnsafe(
          `SELECT * FROM "${item.table}"`
        );
        
        if (rows.length === 0) {
          console.log(`  ⏭️  ${item.table}: No data to migrate`);
          continue;
        }
        
        // Get column names
        const columns = Object.keys(rows[0]);
        const columnsList = columns.map(c => `"${c}"`).join(', ');
        
        // Insert data in batches
        const batchSize = 100;
        let inserted = 0;
        
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          
          for (const row of batch) {
            const values = columns.map(col => {
              const val = row[col];
              if (val === null) return 'NULL';
              if (typeof val === 'string') {
                return `'${val.toString().replace(/'/g, "''")}'`;
              }
              if (val instanceof Date) {
                return `'${val.toISOString()}'`;
              }
              if (typeof val === 'boolean') {
                return val ? 'true' : 'false';
              }
              if (typeof val === 'object') {
                return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
              }
              return val;
            });
            
            const insertSQL = `
              INSERT INTO "${item.table}" (${columnsList})
              VALUES (${values.join(', ')})
              ON CONFLICT DO NOTHING
            `;
            
            try {
              await targetPrisma.$executeRawUnsafe(insertSQL);
              inserted++;
            } catch (insertError) {
              // Skip duplicate key errors
              if (!insertError.message.includes('duplicate key')) {
                console.log(`    ⚠️  Row insert error: ${insertError.message.substring(0, 100)}`);
              }
            }
          }
        }
        
        console.log(`  ✅ ${item.table}: Migrated ${inserted}/${rows.length} records`);
        item.status = 'migrated';
        
      } catch (error) {
        console.log(`  ❌ ${item.table}: ${error.message.substring(0, 150)}`);
        item.status = 'error';
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    
    const migrated = results.filter(r => r.status === 'migrated');
    const errors = results.filter(r => r.status === 'error');
    const skipped = results.filter(r => r.status === 'not_found' || r.status === 'pending');
    
    console.log(`✅ Migrated: ${migrated.length} tables`);
    console.log(`⏭️  Skipped: ${skipped.length} tables`);
    console.log(`❌ Errors: ${errors.length} tables`);
    
    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(e => console.log(`  - ${e.table}`));
    }
    
    console.log('\n🎉 Migration completed!');
    
  } finally {
    await sourcePrisma.$disconnect();
    await targetPrisma.$disconnect();
  }
}

migrateWithPrismaClients().catch(console.error);
