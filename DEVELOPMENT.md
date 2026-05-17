# NutriLens — Notas para desarrolladores

Esta guía recopila las trampas operativas del setup local. Para el contexto del producto y la arquitectura, ver el [`README.md`](./README.md).

---

## Stack y arranque rápido

```bash
# 1. Instalar deps en el host (también lo usan los E2E)
npm ci

# 2. Levantar Postgres (y opcionalmente la app) en Docker
npm run docker:up

# 3. App en modo dev (hot reload). Levantarla en el host es lo más común:
npm run dev
#  → http://localhost:3000
```

Si preferís correr **todo** dentro de Docker (incluyendo la app), `npm run docker:up` ya hace `docker compose up -d` con el servicio `app` definido en `docker-compose.yml`. Eso libera tu host de tener `node`/`prisma` instalados pero introduce el gotcha de la próxima sección.

---

## Gotcha #1 — Container `nutrilens-app` con `node_modules` desactualizado

**Síntoma**:

```
Module not found: Can't resolve 'pdf-parse'
./src/lib/pdf/can-read.ts
```

o variantes con cualquier otra dependencia recién agregada.

**Causa**: `docker-compose.yml` declara un volumen anónimo para `/app/node_modules`. Eso aísla el `node_modules` del container del que tenés en el host (necesario para evitar binarios darwin/linux mezclados). El volumen se llena la **primera** vez que se buildea la imagen `Dockerfile.dev` y queda congelado: cuando alguien agrega una dependencia a `package.json` y corre `npm install` en el host, **el container no se entera**.

**Fix**, de menos a más drástico:

```bash
# A — instalar dentro del container y reiniciar (rápido y no destructivo)
docker compose exec app npm install
docker compose restart app

# B — borrar el volumen del node_modules y dejar que el Dockerfile lo rearme
docker compose down
docker volume ls -q | grep node_modules | xargs docker volume rm
docker compose up -d --build

# C — atómico: borra TODO volumen anónimo (cuidado: también limpia otros)
npm run docker:down
docker volume prune -f
npm run docker:rebuild
```

**Regla práctica**: cada vez que un PR toca `package.json` o `package-lock.json`, **hacé la opción A** antes de probar el flujo end-to-end contra el container.

---

## Gotcha #2 — `pdf-parse` rompe en dev mode (webpack RSC)

**Síntoma**:

```
TypeError: Object.defineProperty called on non-object
  at eval (webpack-internal:///(rsc)/./src/lib/pdf/can-read.ts:5:67)
```

**Causa**: `pdf-parse@2.x` declara `"type": "module"` y exporta dual CJS/ESM. Webpack del bundler server de Next.js (RSC) intenta hacer interop entre ambos y falla.

**Fix** ya aplicado en `next.config.mjs`:

```js
serverExternalPackages: ['pdf-parse'],
```

Eso le dice a Next que **no** lo bundlee — lo deja como `require()` directo al `node_modules` en runtime. El runtime de la API route ya está marcado como `'nodejs'`, así que es seguro.

Si en el futuro otra dep dual-package (Prisma engines, `sharp`, etc.) tira el mismo error, sumarla al array.

---

## Tests

```bash
npm run typecheck           # tsc --noEmit
npm run lint                # ESLint (next lint)
npm run test                # Vitest unit + integration
npm run test:coverage       # con reporte y thresholds (≥80% lines / ≥75% branches en src/lib)
npm run test:e2e            # Playwright en chromium-desktop + chromium-mobile
```

**Importante para los E2E**: `playwright.config.ts` levanta su propio Next.js en el host con `npm run build && npm start`. **No toca el container `nutrilens-app`**. Por eso los E2E pueden estar verdes mientras tu container está roto — son entornos distintos.

Pre-requisitos para que los E2E corran end-to-end:

1. `docker compose up -d db` (o `npm run docker:up` y parar la app: `docker stop nutrilens-app`)
2. `npm run prisma:deploy` (al menos una vez para crear las tablas)

---

## Estructura de carpetas relevante

```
src/
├── app/                    # Next.js App Router (páginas + API routes)
│   ├── api/analyze/        # POST /api/analyze (pipeline entry)
│   ├── api/products/       # GET /api/products + /api/products/[id]
│   └── analizar/           # /analizar (upload) + /analizar/[id] (resultado)
├── components/
│   ├── ui/                 # Design system: Button, Card, Badge, Chip, etc.
│   └── upload/             # <UploadFlow> y subcomponentes
├── lib/
│   ├── ai/                 # Providers (Foundry, Mock) + prompts
│   ├── pipeline/           # Steps + trace
│   ├── rules/              # apply/risk/blacklists (E03)
│   ├── upload/             # State machine + validaciones + hash + XHR
│   └── ...
├── packages/schemas/       # Zod schemas compartidos
└── tokens/                 # CSS variables del design system

tests/
├── unit/                   # Vitest unit (incluye component tests con happy-dom)
├── integration/            # Vitest contra DB real
├── e2e/                    # Playwright specs (POM en pages/)
│   ├── fixtures/           # Archivos binarios para setInputFiles
│   └── pages/              # Page Objects (uno por ruta)
└── setup.ts
```
