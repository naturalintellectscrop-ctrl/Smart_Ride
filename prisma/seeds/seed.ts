/**
 * Database Seed Script
 * Creates initial data for Smart Ride platform
 *
 * Run: bun run db:seed
 */

import { PrismaClient, UserRole, UserStatus, RiderRole, RiderStatus, VehicleType, MerchantType, MerchantStatus, TaskType, TaskStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ==========================================
  // 1. Create Admin User
  // ==========================================
  console.log('👤 Creating admin user...');
  const adminPassword = await hash('Admin@123456', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@smartride.ug' },
    update: {},
    create: {
      email: 'admin@smartride.ug',
      name: 'System Admin',
      passwordHash: adminPassword,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      authProvider: 'email',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // ==========================================
  // 2. Create Demo Client User
  // ==========================================
  console.log('\n👤 Creating demo client user...');
  const clientPassword = await hash('Client@123456', 12);

  const demoClient = await prisma.user.upsert({
    where: { email: 'client@demo.com' },
    update: {},
    create: {
      email: 'client@demo.com',
      name: 'Demo Client',
      phone: '+256700000001',
      passwordHash: clientPassword,
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      authProvider: 'email',
    },
  });
  console.log('✅ Demo client created:', demoClient.email);

  // ==========================================
  // 3. Create Demo Rider
  // ==========================================
  console.log('\n🏍️ Creating demo boda rider...');
  const riderPassword = await hash('Rider@123456', 12);

  const demoRiderUser = await prisma.user.upsert({
    where: { email: 'rider@demo.com' },
    update: {},
    create: {
      email: 'rider@demo.com',
      name: 'John Boda',
      phone: '+256700000002',
      passwordHash: riderPassword,
      role: UserRole.RIDER,
      status: UserStatus.ACTIVE,
      authProvider: 'email',
    },
  });

  const demoRider = await prisma.rider.upsert({
    where: { userId: demoRiderUser.id },
    update: {},
    create: {
      userId: demoRiderUser.id,
      fullName: 'John Boda',
      physicalAddress: 'Kampala, Uganda',
      phone: '+256700000002',
      riderRole: RiderRole.SMART_BODA_RIDER,
      vehicleType: VehicleType.BODA,
      status: RiderStatus.APPROVED,
      isOnline: true,
      currentLatitude: 0.3476,
      currentLongitude: 32.5825,
      rating: 4.8,
      totalTrips: 150,
      completedTrips: 145,
    },
  });

  // Create vehicle for rider
  await prisma.vehicle.upsert({
    where: { riderId: demoRider.id },
    update: {},
    create: {
      riderId: demoRider.id,
      make: 'Bajaj',
      model: 'Boxer 150',
      year: 2022,
      color: 'Red',
      plateNumber: 'UAX 123A',
    },
  });
  console.log('✅ Demo rider created:', demoRiderUser.email);

  // ==========================================
  // 4. Create Demo Car Driver
  // ==========================================
  console.log('\n🚗 Creating demo car driver...');
  const driverPassword = await hash('Driver@123456', 12);

  const demoDriverUser = await prisma.user.upsert({
    where: { email: 'driver@demo.com' },
    update: {},
    create: {
      email: 'driver@demo.com',
      name: 'Peter Driver',
      phone: '+256700000003',
      passwordHash: driverPassword,
      role: UserRole.RIDER,
      status: UserStatus.ACTIVE,
      authProvider: 'email',
    },
  });

  const demoDriver = await prisma.rider.upsert({
    where: { userId: demoDriverUser.id },
    update: {},
    create: {
      userId: demoDriverUser.id,
      fullName: 'Peter Driver',
      physicalAddress: 'Kampala, Uganda',
      phone: '+256700000003',
      riderRole: RiderRole.SMART_CAR_DRIVER,
      vehicleType: VehicleType.CAR,
      status: RiderStatus.APPROVED,
      isOnline: false,
      currentLatitude: 0.3142,
      currentLongitude: 32.6105,
      rating: 4.9,
      totalTrips: 200,
      completedTrips: 195,
    },
  });

  await prisma.vehicle.upsert({
    where: { riderId: demoDriver.id },
    update: {},
    create: {
      riderId: demoDriver.id,
      make: 'Toyota',
      model: 'Corolla',
      year: 2020,
      color: 'White',
      plateNumber: 'UAZ 456B',
    },
  });
  console.log('✅ Demo car driver created:', demoDriverUser.email);

  // ==========================================
  // 5. Create Demo Delivery Personnel
  // ==========================================
  console.log('\n📦 Creating demo delivery personnel...');
  const deliveryPassword = await hash('Delivery@123456', 12);

  const demoDeliveryUser = await prisma.user.upsert({
    where: { email: 'delivery@demo.com' },
    update: {},
    create: {
      email: 'delivery@demo.com',
      name: 'Mike Delivery',
      phone: '+256700000004',
      passwordHash: deliveryPassword,
      role: UserRole.RIDER,
      status: UserStatus.ACTIVE,
      authProvider: 'email',
    },
  });

  const demoDelivery = await prisma.rider.upsert({
    where: { userId: demoDeliveryUser.id },
    update: {},
    create: {
      userId: demoDeliveryUser.id,
      fullName: 'Mike Delivery',
      physicalAddress: 'Kampala, Uganda',
      phone: '+256700000004',
      riderRole: RiderRole.DELIVERY_PERSONNEL,
      vehicleType: VehicleType.BODA,
      status: RiderStatus.APPROVED,
      isOnline: true,
      currentLatitude: 0.3351,
      currentLongitude: 32.5701,
      rating: 4.7,
      totalTrips: 80,
      completedTrips: 78,
      hasReflectorVest: true,
      hasHelmet: true,
      hasInsulatedBox: true,
    },
  });
  console.log('✅ Demo delivery personnel created:', demoDeliveryUser.email);

  // ==========================================
  // 6. Create Demo Restaurants
  // ==========================================
  console.log('\n🍽️ Creating demo restaurants...');

  const restaurants = [
    {
      name: 'Cafe Javas',
      description: 'Popular restaurant in Kampala with local and international cuisine',
      phone: '+256414000001',
      address: 'Kampala Road, Kampala',
      latitude: 0.3177,
      longitude: 32.5817,
    },
    {
      name: 'Java House',
      description: 'East African coffee house and restaurant chain',
      phone: '+256414000002',
      address: 'Acacia Mall, Kisementi',
      latitude: 0.3476,
      longitude: 32.5825,
    },
    {
      name: 'KFC Kampala',
      description: 'Kentucky Fried Chicken - popular fast food chain',
      phone: '+256414000003',
      address: 'Garden City Mall, Kampala',
      latitude: 0.3142,
      longitude: 32.6105,
    },
  ];

  for (const restaurant of restaurants) {
    const existing = await prisma.merchant.findFirst({
      where: { name: restaurant.name, type: MerchantType.RESTAURANT }
    });
    if (!existing) {
      await prisma.merchant.create({
        data: {
          name: restaurant.name,
          type: MerchantType.RESTAURANT,
          description: restaurant.description,
          phone: restaurant.phone,
          address: restaurant.address,
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
          city: 'Kampala',
          isOpen: true,
          openingTime: '08:00',
          closingTime: '22:00',
          status: MerchantStatus.APPROVED,
          commissionRate: 0.15,
        },
      });
    }
  }
  console.log('✅ Created 3 demo restaurants');

  // ==========================================
  // 7. Create Demo Supermarket
  // ==========================================
  console.log('\n🛒 Creating demo supermarkets...');

  const supermarkets = [
    {
      name: 'Shoprite Kampala',
      description: 'Leading supermarket chain in Uganda',
      phone: '+256414000004',
      address: 'Oasis Mall, Kampala',
      latitude: 0.3177,
      longitude: 32.5817,
    },
    {
      name: 'Carrefour Uganda',
      description: 'International supermarket chain',
      phone: '+256414000005',
      address: 'Acacia Mall, Kampala',
      latitude: 0.3476,
      longitude: 32.5825,
    },
  ];

  for (const supermarket of supermarkets) {
    const existing = await prisma.merchant.findFirst({
      where: { name: supermarket.name, type: MerchantType.SUPERMARKET }
    });
    if (!existing) {
      await prisma.merchant.create({
        data: {
          name: supermarket.name,
          type: MerchantType.SUPERMARKET,
          description: supermarket.description,
          phone: supermarket.phone,
          address: supermarket.address,
          latitude: supermarket.latitude,
          longitude: supermarket.longitude,
          city: 'Kampala',
          isOpen: true,
          openingTime: '08:00',
          closingTime: '21:00',
          status: MerchantStatus.APPROVED,
          commissionRate: 0.10,
        },
      });
    }
  }
  console.log('✅ Created 2 demo supermarkets');

  // ==========================================
  // 8. Create Pricing Configuration
  // ==========================================
  console.log('\n💰 Setting up pricing configuration...');

  const pricingConfigs = [
    {
      serviceType: 'SMART_BODA_RIDE',
      baseFare: 2000,
      perKmRate: 150,
      minimumFare: 2000,
      platformCommissionPercent: 10,
    },
    {
      serviceType: 'SMART_CAR_RIDE',
      baseFare: 5000,
      perKmRate: 300,
      minimumFare: 5000,
      platformCommissionPercent: 10,
    },
    {
      serviceType: 'FOOD_DELIVERY',
      baseFare: 2000,
      perKmRate: 150,
      minimumFare: 2000,
      platformCommissionPercent: 15,
    },
    {
      serviceType: 'SHOPPING',
      baseFare: 2500,
      perKmRate: 150,
      minimumFare: 2500,
      platformCommissionPercent: 10,
    },
    {
      serviceType: 'ITEM_DELIVERY',
      baseFare: 1000,
      perKmRate: 100,
      minimumFare: 1000,
      platformCommissionPercent: 10,
    },
  ];

  for (const config of pricingConfigs) {
    await prisma.pricingConfig.upsert({
      where: { serviceType: config.serviceType },
      update: config,
      create: config,
    });
  }
  console.log('✅ Created pricing configurations for all services');

  // ==========================================
  // 9. Create System Configuration
  // ==========================================
  console.log('\n⚙️ Setting up system configuration...');

  const systemConfigs = [
    { key: 'MAX_PICKUP_DISTANCE_KM', value: '5', description: 'Maximum distance for rider pickup' },
    { key: 'RIDE_REQUEST_TIMEOUT_MINUTES', value: '5', description: 'Timeout for ride matching' },
    { key: 'MINIMUM_RIDER_RATING', value: '3.5', description: 'Minimum rating for riders' },
    { key: 'CASH_COLLECTION_THRESHOLD', value: '50000', description: 'Amount before cash collection required' },
    { key: 'PLATFORM_CUSTOMER_SUPPORT_PHONE', value: '+256800123456', description: 'Customer support phone number' },
    { key: 'PLATFORM_CUSTOMER_SUPPORT_EMAIL', value: 'support@smartride.ug', description: 'Customer support email' },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: config,
      create: config,
    });
  }
  console.log('✅ Created system configuration');

  // ==========================================
  // Summary
  // ==========================================
  console.log('\n' + '═'.repeat(60));
  console.log('✅ DATABASE SEED COMPLETED SUCCESSFULLY');
  console.log('═'.repeat(60));
  console.log(`
📋 Created:
   • 1 Admin user
   • 1 Demo client user
   • 3 Demo riders (Boda, Car, Delivery)
   • 5 Demo merchants (3 restaurants, 2 supermarkets)
   • 5 Pricing configurations
   • 6 System configurations

🔐 Demo Credentials:
   Admin:      admin@smartride.ug / Admin@123456
   Client:     client@demo.com / Client@123456
   Boda Rider: rider@demo.com / Rider@123456
   Car Driver: driver@demo.com / Driver@123456
   Delivery:   delivery@demo.com / Delivery@123456

⚠️  IMPORTANT: Change these passwords in production!
`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
