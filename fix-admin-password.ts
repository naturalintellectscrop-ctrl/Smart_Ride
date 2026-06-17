import pkg from '@prisma/client';
import bcrypt from 'bcryptjs';

const { PrismaClient } = pkg;

// Database is hosted on Supabase (PostgreSQL). Read the connection string from
// the environment — never hardcode credentials. Set DATABASE_URL in your shell
// or .env before running this script.
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function main() {
  const email = 'naturalintellectscrop@gmail.com';
  const password = 'Admin@123';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('Generated hash:', hash);
  
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { password: hash }
    });
    
    console.log('✅ Updated user:', user.email);
    console.log('✅ Password has been reset to: Admin@123');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    
    // Try to find the user first
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!existingUser) {
      console.log('User not found. Creating new admin user...');
      
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hash,
          name: 'Admin',
          role: 'SUPER_ADMIN',
          phone: '+256700000000',
          isVerified: true,
        }
      });
      console.log('✅ Created admin user:', newUser.email);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
