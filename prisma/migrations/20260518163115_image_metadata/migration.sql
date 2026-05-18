-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "imagenBytes" INTEGER,
ADD COLUMN     "imagenMime" TEXT;

-- Data fix: las imágenes analizadas ahora viven en `public/uploads/analyzed/`
-- para que Next.js las sirva como estáticos. Reescribimos los paths antiguos
-- (`/uploads/<hash>.<ext>`) al nuevo prefijo, dejando intactos los seeds
-- (`/uploads/seed/*`) y cualquier path ya migrado (`/uploads/analyzed/*`).
UPDATE "Product"
SET "imagenPath" = REPLACE("imagenPath", '/uploads/', '/uploads/analyzed/')
WHERE "imagenPath" LIKE '/uploads/%'
  AND "imagenPath" NOT LIKE '/uploads/seed/%'
  AND "imagenPath" NOT LIKE '/uploads/analyzed/%';
