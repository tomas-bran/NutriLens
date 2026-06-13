-- NL-203: dueño de la conversación. Las conversaciones preexistentes (de la
-- etapa single-user) se asignan a un sentinel para no perderlas; ningún
-- usuario real las verá (su Google sub nunca es '__legacy__').
ALTER TABLE "Conversation" ADD COLUMN "userId" TEXT NOT NULL DEFAULT '__legacy__';
ALTER TABLE "Conversation" ALTER COLUMN "userId" DROP DEFAULT;

DROP INDEX IF EXISTS "Conversation_updatedAt_idx";
CREATE INDEX "Conversation_userId_updatedAt_idx" ON "Conversation" ("userId", "updatedAt");
