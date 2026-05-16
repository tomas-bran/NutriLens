# Getting Started — NutriLens

Pasos para clonar, instalar y arrancar el proyecto en local. Pensado para nuevos
integrantes del equipo o cualquiera que clona el repo por primera vez.

## Requisitos previos

- **Docker Desktop** 4.30+ (incluye `docker compose`).
- **Node.js 20+** (`node -v`) — solo necesario si vas a correr la app fuera de docker.
- **Git**.

## Opción A — Todo en Docker (recomendado)

Levanta la app + Postgres con un solo comando.

```bash
git clone https://github.com/FedericoMartucci/NutriLens.git
cd NutriLens

# 1. Variables de entorno (copiar template y editar si hace falta)
cp .env.example .env.local

# 2. Levantar el stack completo (app + db)
docker compose up -d

# 3. Ver logs (Ctrl+C para salir, los containers siguen corriendo)
docker compose logs -f app

# → http://localhost:3000
```

Comandos útiles:

| Comando | Para qué |
|---------|----------|
| `docker compose up -d` | Levantar en background |
| `docker compose down` | Apagar containers |
| `docker compose down -v` | Apagar y borrar el volumen de Postgres (reset total) |
| `docker compose logs -f app` | Tail de logs de la app |
| `docker compose exec app sh` | Shell dentro del container de la app |
| `docker compose exec db psql -U nutrilens` | psql al Postgres del compose |
| `docker compose up -d --build` | Rebuild después de tocar `Dockerfile*` o `package.json` |

## Opción B — Postgres en Docker + app en local

Útil si querés debuggear la app con VSCode pegado al proceso de Node.

```bash
# Sólo levantar Postgres
docker compose up -d db

# Instalar deps en el host
npm install

# Generar cliente Prisma + aplicar migraciones
npx prisma generate
npx prisma migrate dev --name init

# (opcional) seed de productos mock
npm run seed

# Dev server
npm run dev
# → http://localhost:3000
```

## Variables mínimas para arrancar en dev

En `.env.local`:

```bash
# No Azure (default recomendado en dev): usa MockIaProvider
IA_PROVIDER=mock

# DB en docker compose
DATABASE_URL=postgresql://nutrilens:nutrilens@localhost:5432/nutrilens
```

Con esto la app arranca, no llama a Azure y los tests pasan sin consumir crédito.

## Para probar con Phi-4 real (Azure AI Foundry)

```bash
IA_PROVIDER=foundry
AZURE_AI_FOUNDRY_ENDPOINT=https://<your-resource>.services.ai.azure.com/openai/v1
AZURE_AI_FOUNDRY_KEY=<your-key>
AZURE_AI_FOUNDRY_MODEL_MULTIMODAL=Phi-4-multimodal-instruct
AZURE_AI_FOUNDRY_MODEL_MINI=Phi-4-mini-instruct
```

## Scripts disponibles

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server (hot reload) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint, max 0 warnings |
| `npm run format` | Prettier auto-fix |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit + integration |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Vitest with coverage thresholds |
| `npm run test:e2e` | Playwright E2E (slow) |
| `npm run test:ci` | Everything the CI runs |
| `npm run prisma:migrate` | Prisma migrate dev |
| `npm run prisma:studio` | Prisma Studio (DB GUI) |
| `npm run seed` | Seed the DB with mock products |
| `npm run docker:up` | `docker compose up -d` |
| `npm run docker:down` | `docker compose down` |
| `npm run docker:logs` | Tail app logs |
| `npm run docker:rebuild` | Rebuild and restart containers |

## Workflow para implementar una US

Ver [`implement-story.md`](./implement-story.md) o decirle a Claude
"implementemos US-XX" (carga la skill automáticamente).
