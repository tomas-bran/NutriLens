-- "Analizados por vos": vínculo usuario↔producto. Se registra de ahora en
-- adelante cuando un usuario logueado analiza/re-analiza un producto (sin
-- backfill). El producto sigue siendo compartido; este join alimenta el
-- filtro `?filtro=mios` del catálogo.
CREATE TABLE "ProductAnalysis" (
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductAnalysis_pkey" PRIMARY KEY ("userId","productId")
);

-- Listado por usuario ordenado por fecha (lo que pide el filtro "mios").
CREATE INDEX "ProductAnalysis_userId_createdAt_idx" ON "ProductAnalysis"("userId", "createdAt");

ALTER TABLE "ProductAnalysis" ADD CONSTRAINT "ProductAnalysis_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
