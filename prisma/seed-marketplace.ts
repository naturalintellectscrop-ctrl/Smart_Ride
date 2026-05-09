import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Kampala metropolitan zones
const ZONES = [
  {
    name: 'Kampala Central',
    code: 'KLA-CEN',
    centerLatitude: 0.3167,
    centerLongitude: 32.5825,
    radiusKm: 3,
    zoneType: 'URBAN',
    priority: 5,
  },
  {
    name: 'Nakasero',
    code: 'KLA-NAK',
    centerLatitude: 0.3217,
    centerLongitude: 32.5765,
    radiusKm: 2,
    zoneType: 'COMMERCIAL',
    priority: 4,
  },
  {
    name: 'Kololo',
    code: 'KLA-KOL',
    centerLatitude: 0.3333,
    centerLongitude: 32.5917,
    radiusKm: 2.5,
    zoneType: 'COMMERCIAL',
    priority: 4,
  },
  {
    name: 'Makindye',
    code: 'KLA-MAK',
    centerLatitude: 0.2833,
    centerLongitude: 32.5833,
    radiusKm: 3,
    zoneType: 'RESIDENTIAL',
    priority: 3,
  },
  {
    name: 'Nakawa',
    code: 'KLA-NKW',
    centerLatitude: 0.3389,
    centerLongitude: 32.6200,
    radiusKm: 3,
    zoneType: 'INDUSTRIAL',
    priority: 3,
  },
  {
    name: 'Rubaga',
    code: 'KLA-RUB',
    centerLatitude: 0.3056,
    centerLongitude: 32.5544,
    radiusKm: 3,
    zoneType: 'RESIDENTIAL',
    priority: 3,
  },
  {
    name: 'Kawempe',
    code: 'KLA-KWM',
    centerLatitude: 0.3667,
    centerLongitude: 32.5625,
    radiusKm: 3,
    zoneType: 'RESIDENTIAL',
    priority: 2,
  },
  {
    name: 'Entebbe Airport',
    code: 'EBB-AIR',
    centerLatitude: 0.0424,
    centerLongitude: 32.4435,
    radiusKm: 5,
    zoneType: 'AIRPORT',
    priority: 5,
  },
  {
    name: 'Entebbe Town',
    code: 'EBB-TWN',
    centerLatitude: 0.0619,
    centerLongitude: 32.4644,
    radiusKm: 3,
    zoneType: 'URBAN',
    priority: 3,
  },
  {
    name: 'Mukono',
    code: 'MUK-MNK',
    centerLatitude: 0.3544,
    centerLongitude: 32.7522,
    radiusKm: 4,
    zoneType: 'SUBURBAN',
    priority: 2,
  },
  {
    name: 'Nansana',
    code: 'KLA-NSN',
    centerLatitude: 0.3633,
    centerLongitude: 32.5478,
    radiusKm: 3,
    zoneType: 'SUBURBAN',
    priority: 2,
  },
  {
    name: 'Kira Town',
    code: 'KLA-KRA',
    centerLatitude: 0.3978,
    centerLongitude: 32.6472,
    radiusKm: 3,
    zoneType: 'SUBURBAN',
    priority: 2,
  },
  {
    name: 'Najjera',
    code: 'KLA-NJR',
    centerLatitude: 0.3917,
    centerLongitude: 32.6167,
    radiusKm: 2,
    zoneType: 'RESIDENTIAL',
    priority: 3,
  },
  {
    name: 'Bwaise',
    code: 'KLA-BWS',
    centerLatitude: 0.3583,
    centerLongitude: 32.5750,
    radiusKm: 2,
    zoneType: 'RESIDENTIAL',
    priority: 2,
  },
  {
    name: 'Acacia Mall Area',
    code: 'KLA-ACA',
    centerLatitude: 0.3361,
    centerLongitude: 32.5944,
    radiusKm: 1.5,
    zoneType: 'ENTERTAINMENT',
    priority: 4,
  },
];

// Generate random metrics for each zone
function generateMetrics() {
  const hour = new Date().getHours();
  const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
  const isNight = hour >= 22 || hour <= 5;
  
  // Base values
  let baseRequests = 20 + Math.floor(Math.random() * 30);
  let baseDrivers = 15 + Math.floor(Math.random() * 20);
  
  // Peak hour adjustment
  if (isPeakHour) {
    baseRequests = Math.floor(baseRequests * 2.5);
    baseDrivers = Math.floor(baseDrivers * 1.5);
  }
  
  // Night reduction
  if (isNight) {
    baseRequests = Math.floor(baseRequests * 0.3);
    baseDrivers = Math.floor(baseDrivers * 0.4);
  }
  
  return {
    rideRequests: baseRequests,
    uniqueRequesters: Math.floor(baseRequests * 0.7),
    activeDrivers: baseDrivers,
    availableDrivers: Math.floor(baseDrivers * (0.3 + Math.random() * 0.4)),
    busyDrivers: 0, // Will be calculated
  };
}

async function main() {
  console.log('Seeding Marketplace Balance data...');

  // Create zones
  for (const zone of ZONES) {
    const existing = await prisma.geographicZone.findUnique({
      where: { code: zone.code },
    });

    if (!existing) {
      const created = await prisma.geographicZone.create({
        data: zone,
      });

      // Generate initial metrics
      const metrics = generateMetrics();
      metrics.busyDrivers = metrics.activeDrivers - metrics.availableDrivers;
      
      const ratio = metrics.availableDrivers > 0 
        ? metrics.rideRequests / metrics.availableDrivers 
        : (metrics.rideRequests > 0 ? 999 : 0);
      
      let balanceStatus = 'BALANCED';
      if (ratio < 0.5) balanceStatus = 'OVERSUPPLIED';
      else if (ratio >= 1.3 && ratio < 1.8) balanceStatus = 'HIGH_DEMAND';
      else if (ratio >= 1.8 && ratio < 2.5) balanceStatus = 'SURGE';
      else if (ratio >= 2.5) balanceStatus = 'CRITICAL';

      const now = new Date();
      const timeBucket = `${now.toISOString().split('T')[0]}-${now.getHours()}`;

      await prisma.zoneMetric.create({
        data: {
          zoneId: created.id,
          timeBucket,
          rideRequests: metrics.rideRequests,
          uniqueRequesters: metrics.uniqueRequesters,
          activeDrivers: metrics.activeDrivers,
          availableDrivers: metrics.availableDrivers,
          busyDrivers: metrics.busyDrivers,
          demandSupplyRatio: ratio,
          balanceStatus: balanceStatus as any,
          surgeMultiplier: 1.0,
          surgeActive: false,
          weatherCondition: 'CLEAR',
          trafficLevel: now.getHours() >= 17 && now.getHours() <= 20 ? 'HIGH' : 'MEDIUM',
        },
      });

      console.log(`Created zone: ${zone.name} with metrics`);
    } else {
      console.log(`Zone already exists: ${zone.name}`);
    }
  }

  // Create a sample incentive
  const existingIncentive = await prisma.driverIncentive.findFirst();
  if (!existingIncentive) {
    const centralZone = await prisma.geographicZone.findFirst({
      where: { code: 'KLA-CEN' },
    });

    if (centralZone) {
      const now = new Date();
      const startTime = new Date(now);
      startTime.setHours(17, 0, 0, 0);
      const endTime = new Date(now);
      endTime.setHours(21, 0, 0, 0);

      await prisma.driverIncentive.create({
        data: {
          name: 'Evening Rush Bonus',
          description: 'Complete 5 rides in Kampala Central between 5PM-9PM and earn UGX 15,000 bonus',
          incentiveType: 'PEAK_HOUR_BONUS',
          rewardAmount: 15000,
          rewardType: 'CASH',
          zoneId: centralZone.id,
          minRides: 5,
          startTime,
          endTime,
          validDays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI']),
          status: 'ACTIVE',
        },
      });
      console.log('Created sample incentive');
    }
  }

  console.log('Marketplace Balance seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
