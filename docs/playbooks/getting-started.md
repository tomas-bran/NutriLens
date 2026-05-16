# Getting Started — NutriLens

Pasos para clonar, instalar y arrancar el proyecto en local. Pensado para nuevos
integrantes del equipo o para cualquiera que clona el repo por primera vez.

## Requisitos previos

- Node.js 20+ (`node -v`)
- npm 10+
- Git

## Setup inicial

```bash
git clone https://github.com/FedericoMartucci/NutriLens.git
cd NutriLens

# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores (ver sección abajo)

# 3. Generar cliente de Prisma y aplicar migraciones
npx prisma generate
npx prisma migrate dev --name init

# 4. (opcional) Seed con productos mock para demo
npm run seed

# 5. Arrancar la app
npm run dev
# → http://localhost:3000
```

## Variables mínimas para arrancar en dev

En `.env.local`:

```bash
# Sin Azure (default recomendado para dev): usa MockIaProvider
IA_PROVIDER=mock

# DB local SQLite
DATABASE_URL=file:./prisma/dev.db
```

Con esto la app arranca, no llama a Azure y los tests pasan sin consumir crédito.

## Para probar con Phi-4 real (Azure AI Foundry)

```bash
IA_PROVIDER=foundry
AZURE_AI_FOUNDRY_ENDPOINT=https://<tu-resource>.services.ai.azure.com/openai/v1
AZURE_AI_FOUNDRY_KEY=<tu-key>
AZURE_AI_FOUNDRY_MODEL_MULTIMODAL=Phi-4-multimodal-instruct
AZURE_AI_FOUNDRY_MODEL_MINI=Phi-4-mini-instruct
```

## Scripts disponibles

| Comando | Para qué |
|---------|----------|
| `npm run dev` | Servidor de desarrollo (hot reload) |
| `npm run build` | Build de producción |
| `npm run start` | Servir el build |
| `npm run lint` | ESLint + max 0 warnings |
| `npm run format` | Prettier auto-fix |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit + integration |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Vitest con coverage threshold |
| `npm run test:e2e` | Playwright E2E (lento) |
| `npm run test:ci` | Lo mismo que corre la CI |
| `npm run seed` | Poblar DB con productos mock |

## Workflow para implementar una US

Ver [`implement-story.md`](./implement-story.md) o decirle a Claude
"implementemos US-XX" (carga la skill automáticamente).
