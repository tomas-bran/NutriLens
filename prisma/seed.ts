/**
 * Prisma seed — placeholder del Sprint 0.
 *
 * El seed real con 25 productos se implementa en la US-38 (E06).
 * Por ahora dejamos la estructura lista y un seed vacío que no rompa CI.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.warn(
    '[seed] Sprint 0: seed placeholder, no se insertan productos. Ver US-38 para la implementación final.',
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
