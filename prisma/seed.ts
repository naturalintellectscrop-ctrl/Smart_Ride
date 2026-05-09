import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Hash the password
  const passwordHash = await bcrypt.hash('owner123', 10);

  // Upsert admin user (create or update)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@smartride.com' },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      role: UserRole.ADMIN,
    },
    create: {
      email: 'admin@smartride.com',
      name: 'Admin User',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      authProvider: 'email',
    },
  });

  console.log('Admin user ready:');
  console.log('  Email:', admin.email);
  console.log('  Name:', admin.name);
  console.log('  Role:', admin.role);
  console.log('  Password: owner123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
