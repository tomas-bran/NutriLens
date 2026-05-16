/**
 * Prisma seed — Sprint 0 placeholder.
 *
 * The real seed with 25 products is implemented in US-38 (E06).
 * For now we keep the file structure and a no-op so CI doesn't break.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.warn(
    '[seed] Sprint 0: placeholder seed — no products are inserted. See US-38 for the final implementation.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
