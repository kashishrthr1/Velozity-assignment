import { seedDatabase } from '../src/lib/seed';
import { prisma } from '../src/lib/prisma';

async function main() {
  await seedDatabase(true);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
