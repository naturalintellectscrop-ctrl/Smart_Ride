// ============================================
// SMART RIDE - SEED RIDER CAPABILITIES
// ============================================
// Seeds default capabilities for each rider role:
// - Smart Boda Riders: rides, item delivery
// - Smart Car Drivers: passenger rides only
// - Delivery Personnel: food, shopping, item, health delivery
// ============================================

import { db } from '@/lib/db';
import { RiderRole, TaskType } from '@prisma/client';

const DEFAULT_CAPABILITIES = [
  // Smart Boda Rider capabilities
  { riderRole: RiderRole.SMART_BODA_RIDER, taskType: TaskType.SMART_BODA_RIDE, requiresVehicle: false },
  { riderRole: RiderRole.SMART_BODA_RIDER, taskType: TaskType.ITEM_DELIVERY, requiresVehicle: false },

  // Smart Car Driver capabilities
  { riderRole: RiderRole.SMART_CAR_DRIVER, taskType: TaskType.SMART_CAR_RIDE, requiresVehicle: true },

  // Delivery Personnel capabilities
  { riderRole: RiderRole.DELIVERY_PERSONNEL, taskType: TaskType.FOOD_DELIVERY, requiresInsulatedBox: true },
  { riderRole: RiderRole.DELIVERY_PERSONNEL, taskType: TaskType.SHOPPING },
  { riderRole: RiderRole.DELIVERY_PERSONNEL, taskType: TaskType.ITEM_DELIVERY },
  { riderRole: RiderRole.DELIVERY_PERSONNEL, taskType: TaskType.SMART_HEALTH_DELIVERY, requiresInsulatedBox: true },
];

async function seedCapabilities() {
  console.log('🌱 Seeding rider capabilities...');

  for (const cap of DEFAULT_CAPABILITIES) {
    await db.riderCapability.upsert({
      where: {
        riderRole_taskType: {
          riderRole: cap.riderRole,
          taskType: cap.taskType,
        },
      },
      update: {
        isAllowed: true,
        requiresVehicle: cap.requiresVehicle || false,
        requiresInsulatedBox: cap.requiresInsulatedBox || false,
      },
      create: {
        riderRole: cap.riderRole,
        taskType: cap.taskType,
        isAllowed: true,
        requiresVehicle: cap.requiresVehicle || false,
        requiresInsulatedBox: cap.requiresInsulatedBox || false,
        notes: getDefaultNote(cap.riderRole, cap.taskType),
      },
    });
    console.log(`  ✅ ${cap.riderRole} → ${cap.taskType}`);
  }

  console.log('✅ Rider capabilities seeded successfully!');
}

function getDefaultNote(role: RiderRole, taskType: TaskType): string {
  switch (role) {
    case RiderRole.SMART_BODA_RIDER:
      return 'Boda riders can handle motorcycle rides and small item deliveries';
    case RiderRole.SMART_CAR_DRIVER:
      return 'Car drivers are exclusively for passenger rides';
    case RiderRole.DELIVERY_PERSONNEL:
      return 'Delivery personnel handle all delivery services';
    default:
      return '';
  }
}

// Run the seed
seedCapabilities()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed error:', e);
    await db.$disconnect();
    process.exit(1);
  });

export { seedCapabilities };
