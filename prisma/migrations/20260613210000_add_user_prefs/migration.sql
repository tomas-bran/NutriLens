-- NL-208: preferencias de dieta por usuario.
CREATE TABLE "UserPrefs" (
    "userId" TEXT NOT NULL,
    "vegano" BOOLEAN NOT NULL DEFAULT false,
    "celiaco" BOOLEAN NOT NULL DEFAULT false,
    "lactosa" BOOLEAN NOT NULL DEFAULT false,
    "avisos" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserPrefs_pkey" PRIMARY KEY ("userId")
);
