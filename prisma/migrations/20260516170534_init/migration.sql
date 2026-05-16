-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('galletitas', 'cereales', 'snacks', 'lacteos', 'bebidas', 'sin_tacc', 'veganos', 'otros');

-- CreateEnum
CREATE TYPE "Riesgo" AS ENUM ('bajo', 'medio', 'alto');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "Categoria" NOT NULL,
    "ingredientes" TEXT NOT NULL,
    "alergenos" TEXT NOT NULL,
    "sellos" TEXT NOT NULL,
    "aptoVegano" BOOLEAN NOT NULL,
    "aptoCeliaco" BOOLEAN NOT NULL,
    "aptoSinLactosa" BOOLEAN NOT NULL,
    "riesgo" "Riesgo" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reglasAplicadas" TEXT NOT NULL,
    "explanation" TEXT,
    "jsonRaw" TEXT NOT NULL,
    "pipelineTrace" TEXT NOT NULL,
    "imagenPath" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_fileHash_key" ON "Product"("fileHash");

-- CreateIndex
CREATE INDEX "Product_categoria_idx" ON "Product"("categoria");

-- CreateIndex
CREATE INDEX "Product_riesgo_idx" ON "Product"("riesgo");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");
