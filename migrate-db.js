/**
 * Database Migration Script: Railway → Supabase
 *
 * This script migrates all data from Railway PostgreSQL to Supabase PostgreSQL.
 * Target connection string is read from the DATABASE_URL env var (Supabase).
 */

const { PrismaClient } = require('@prisma/client');

// Source database (legacy Railway). Override with RAILWAY_URL env var if needed.
const RAILWAY_URL = process.env.RAILWAY_URL || "postgresql://postgres:yGphbfshRKrZSMLNPGCwJXGckrTOalVL@maglev.proxy.rlwy.net:55740/railway";
// Target database = Supabase. Read from env — never hardcode credentials.
const SUPABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL) {
  console.error('ERROR: DATABASE_URL env var must be set to the Supabase connection string.');
  process.exit(1);
}

// Create Prisma clients for both databases
const sourcePrisma = new PrismaClient({
  datasources: {
    db: { url: RAILWAY_URL }
  }
});

const targetPrisma = new PrismaClient({
  datasources: {
    db: { url: SUPABASE_URL }
  }
});

// Tables to migrate in order (respecting foreign key constraints)
const TABLES_TO_MIGRATE = [
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

async function migrateTable(modelName) {
  console.log(`\n📦 Migrating ${modelName}...`);
  
  try {
    // Get all records from source
    const records = await sourcePrisma[modelName].findMany();
    
    if (records.length === 0) {
      console.log(`  ⚠️  No records found in ${modelName}`);
      return { model: modelName, count: 0, status: 'empty' };
    }
    
    console.log(`  📊 Found ${records.length} records`);
    
    // Insert into target (using createMany with skipDuplicates)
    const result = await targetPrisma[modelName].createMany({
      data: records,
      skipDuplicates: true
    });
    
    console.log(`  ✅ Migrated ${result.count} records`);
    return { model: modelName, count: result.count, status: 'success' };
    
  } catch (error) {
    console.error(`  ❌ Error migrating ${modelName}:`, error.message);
    return { model: modelName, count: 0, status: 'error', error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting Database Migration: Railway → Supabase');
  console.log('='.repeat(50));
  console.log(`Source: Railway (${RAILWAY_URL.split('@')[1]?.split('/')[0] || 'railway'})`);
  console.log(`Target: Supabase (${SUPABASE_URL.split('@')[1]?.split('/')[0] || 'supabase'})`);
  console.log('='.repeat(50));
  
  const results = [];
  
  // Test connections
  console.log('\n🔌 Testing connections...');
  
  try {
    await sourcePrisma.$connect();
    console.log('  ✅ Connected to Railway (source)');
  } catch (error) {
    console.error('  ❌ Failed to connect to Railway:', error.message);
    process.exit(1);
  }
  
  try {
    await targetPrisma.$connect();
    console.log('  ✅ Connected to Supabase (target)');
  } catch (error) {
    console.error('  ❌ Failed to connect to Supabase:', error.message);
    process.exit(1);
  }
  
  // Migrate tables
  console.log('\n📋 Migrating tables...');
  
  for (const table of TABLES_TO_MIGRATE) {
    const result = await migrateTable(table);
    results.push(result);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.status === 'success');
  const empty = results.filter(r => r.status === 'empty');
  const errors = results.filter(r => r.status === 'error');
  
  console.log(`✅ Successful: ${successful.length} tables (${successful.reduce((a, b) => a + b.count, 0)} records)`);
  console.log(`⚠️  Empty: ${empty.length} tables`);
  console.log(`❌ Errors: ${errors.length} tables`);
  
  if (errors.length > 0) {
    console.log('\nError details:');
    errors.forEach(e => console.log(`  - ${e.model}: ${e.error}`));
  }
  
  console.log('\n🎉 Migration completed!');
}

main()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await sourcePrisma.$disconnect();
    await targetPrisma.$disconnect();
  });
