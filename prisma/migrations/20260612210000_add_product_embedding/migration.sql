-- NL-401: embeddings de productos para RAG semántico (pgvector).
-- La extensión ya está allowlisteada en Azure (azure.extensions=vector);
-- en local/CI la imagen pgvector/pgvector:pg16 la trae incluida.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Product" ADD COLUMN "embedding" vector(1536);

-- HNSW por coseno: recall alto sin tuning para un historial de cientos/miles
-- de filas; se crea acá para no pagar un índice ad-hoc en la primera query.
CREATE INDEX "Product_embedding_idx" ON "Product" USING hnsw ("embedding" vector_cosine_ops);
