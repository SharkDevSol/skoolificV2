// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const { seedFinanceModule } = require('./seeds/financeSeeds');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...\n');

  // Seed basic users
  console.log('Seeding basic users...');
  await prisma.user.upsert({
    where: { username: 'director1' },
    update: {},
    create: { 
      name: 'Director Test', 
      role: 'director', 
      username: 'director1' 
    },
  });
  console.log('Basic users seeded.\n');

  // Seed Finance Module
  await seedFinanceModule();

  console.log('\n✅ All seeding completed successfully!');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    prisma.$disconnect();
    process.exit(1);
  });