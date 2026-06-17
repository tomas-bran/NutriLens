-- AlterTable: add optional OFF enrichment column (NL-601)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "offEnrichment" TEXT;
