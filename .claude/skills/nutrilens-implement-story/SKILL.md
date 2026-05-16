---
name: nutrilens-implement-story
description: Playbook oficial para implementar una user story de NutriLens. Triggerea con frases como "implementemos US-XX", "tomemos la story US-XX", "arranquemos con la US-XX", "implement story", "vamos con la próxima story", o cuando el usuario referencia un código de story (US-01 a US-39). Incluye lectura del spec, creación de branch, implementación según AC, tests por tipo de story con coverage exhaustivo (unit + integration + E2E con Playwright), body del PR con cierre automático en Azure DevOps y checklist de verificación.
---

# NutriLens — Implementar una user story

Playbook oficial del proyecto. Seguilo en orden para cada story que tomes. Pensado para ejecutarse por un agente (Claude) con acceso al repo, pero también sirve de guía para devs humanos.

---

## 1. Pre-implementación — entender qué hay que hacer

Antes de tocar código:

1. **Leer la US** en `docs/backlog/stories/E0X-*.md`. Identificar:
   - El "Como / quiero / para".
   - Todos los escenarios Gherkin — **cada uno se traduce en al menos un test**.
   - Story points y prioridad.

2. **Leer el spec de la épica** en `docs/specs/E0X-*.md`. Buscar:
   - Contratos de API (request/response).
   - Schemas Zod aplicables.
   - Pipeline steps o componentes UI.
   - Decisiones técnicas ya tomadas (no re-discutir).
   - **Sección "Casos borde"** — todos van con su test.

3. **Si el spec contradice la US o tiene un gap**, NO improvisar — preguntar al usuario. Cualquier desvío del spec se documenta en el PR.

4. **Si la story depende de otras**, confirmar que estén mergeadas en `main`. Si no, escalar.

---

## 2. Setup — crear la branch

```bash
git checkout main
git pull origin main
git checkout -b feat/US-XX-<slug-corto>
```

Naming:

- Story individual: `feat/US-08-endpoint-analyze`, `fix/US-12-sello-detection`.
- Multi-story de la misma épica: `feat/E06-design-tokens`.
- Slug: minúsculas, guiones, 3-5 palabras max.

---

## 3. Implementación — seguir el spec, no inventar

1. **El spec es la fuente de verdad.** `temperature: 0.1` no es `0.2`. Timeout 25s no son 30s.
2. **No agregar features fuera del scope de la US.** Anotalas como "follow-up" en el PR.
3. **No agregar dependencias nuevas sin avisar.**
4. **`.env.example`**: agregar variables nuevas con default razonable y comentario. Nunca commitear valores reales.
5. **Convenciones:**
   - TypeScript estricto, sin `any` salvo justificado con comentario.
   - Imports `@/` para `src/`.
   - Archivos `kebab-case.ts`, componentes React `PascalCase.tsx`.
   - Funciones de pipeline `snake_case` (consistente con specs).
6. **Logging:** shape JSON del `00-overview.md §8`. Con `requestId`, sin PII.

---

## 4. Tests — disciplina exhaustiva (NO NEGOCIABLE)

### 4.1 Reglas duras del proyecto

- **Coverage thresholds (Vitest)**: `src/lib/**` requiere **≥80% lines, ≥75% branches**. El CI falla si baja.
- **Cada escenario Gherkin de la US → al menos un test.** Si la US tiene 4 escenarios y hay 3 tests, **no se mergea**.
- **Casos borde del spec son obligatorios.** Cada `docs/specs/E0X-*.md` lista casos borde en su sección §"Casos borde" — todos van cubiertos.
- **E2E con Playwright** para flujos completos: upload → resultado, historial → detalle, chat → respuesta. Corre en CI como **required check** en PRs a `main`.
- **Sin tests "happy path solamente".** Para cada caso ok, al menos un caso de error con su error code esperado.

### 4.2 Tests mínimos por tipo de story

> **Regla general:** los tests **no son solo de backend**. Cada story exige el set mínimo de su fila, **más** todos los tests de front (unit + integration) que correspondan según lo que toque la implementación. Si la US tiene contraparte UI (página, componente, hook, estado, formulario, navegación), **agregar los tests de front aunque la tabla los marque como opcionales** — el criterio es "lo que considere necesario según la implementación", no "lo mínimo".

| Tipo de story                                                                | Tests requeridos                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Endpoint backend** (`POST /api/...`, `GET /api/...`)                       | Unit del handler (mocks de deps) + integration con DB en memoria + un test por cada error code del spec. **Si hay UI que consume el endpoint**, sumar unit del hook/cliente + integration del flujo en pantalla. |
| **Step del pipeline** (`validate_file`, `apply_rules`, `compute_risk`, etc.) | Unit cubriendo cada rama del Gherkin + cada caso borde del spec                                                                                                                                                  |
| **Provider IA** (`FoundryProvider`, `MockIaProvider`)                        | Unit con mocks de fetch/SDK + tests de mapeo de errores (429 → `model_rate_limited`, etc.) + test de `stripJsonFences`                                                                                           |
| **Schema Zod**                                                               | Tabla de pruebas: 5+ inputs válidos / 5+ inválidos con assertion del error de Zod                                                                                                                                |
| **Reglas / fórmulas** (`compute_risk`, blacklists)                           | Tabla de verdad completa del spec. Cada celda = un test                                                                                                                                                          |
| **Componente UI** (Button, Card, Chip, ErrorState, etc.)                     | Unit con `@testing-library/react`: variantes, estados, accesibilidad básica (roles + aria). Integration si el componente compone hooks/contexto/red.                                                             |
| **Pantalla / página**                                                        | Unit del page (render + interacciones key) + integration con los hooks/stores reales mockeando solo el borde HTTP + E2E del flujo del usuario en chrome y mobile-web                                             |
| **Hook / cliente HTTP / store**                                              | Unit con mocks de fetch + integration verificando que el componente consumidor renderiza loading/success/error                                                                                                   |
| **Migración Prisma**                                                         | Integration: aplicar migración + validar shape resultante + rollback si aplica                                                                                                                                   |

### 4.3 Casos borde cross-cutting que SIEMPRE testeamos

- **Input vacío / null / undefined** donde la API lo permita.
- **Strings con caracteres especiales** (tildes, comillas, emojis) en campos de texto.
- **Arrays muy grandes** cuando hay paginación o límites (200 items, 1000 items).
- **Concurrencia** donde haya races (upload del mismo hash 2 veces simultáneo, dedupe).
- **Timeouts** simulados con `MockIaProvider` que tarda más del threshold.
- **Errores del proveedor** (429, 500, 503) con mock del SDK.
- **Schema inválido del modelo** (JSON parseable pero con campos faltantes / tipos malos).
- **Localización**: tildes en `producto`, "leche" vs "Leche" en matching.

### 4.4 E2E con Playwright — flujos obligatorios al cierre del MVP

```
tests/e2e/
├── upload-happy-path.spec.ts     # foto válida → ver resultado completo
├── upload-rejected.spec.ts       # PDF dañado → ver ErrorState + retry
├── upload-not-food.spec.ts       # imagen aleatoria → image_not_supported
├── history-empty.spec.ts         # primera vez, sin productos → EmptyState
├── history-list-and-filter.spec.ts  # listar + filtrar por categoría/riesgo
├── history-detail.spec.ts        # abrir detalle desde historial → ver JSON + pipeline
├── chat-with-context.spec.ts     # pregunta con productos en historial → respuesta + chips
├── chat-no-context.spec.ts       # historial vacío → mensaje empty + sugerencia
└── responsive.spec.ts            # smoke en viewport mobile (375x667) y desktop (1280x800)
```

Cada E2E usa **`MockIaProvider` + seed de fixture** (no consume tokens, es reproducible). Para tests que requieran el provider real (esporádicos), usar `@smoke` tag y correrlos manualmente.

#### 4.4.1 Dual target obligatorio: chrome **y** mobile-web

Toda story con UI corre sus E2E en **dos proyectos de Playwright**:

- `chromium` — desktop, viewport `1280x800`.
- `mobile-web` — Pixel 5 / iPhone 13 emulado (`devices['Pixel 5']`), viewport `375x667` o `390x844`, touch + user agent móvil.

`playwright.config.ts` debe declarar ambos `projects`. Si un test no aplica a uno de los dos targets (caso raro), justificarlo en un comentario `// @desktop-only` o `// @mobile-only` y skippearlo con `test.skip` condicional — **nunca borrarlo**.

```bash
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=mobile-web
npm run test:e2e                        # corre ambos
```

El CI corre **los dos proyectos**; si uno falla, el PR queda bloqueado.

#### 4.4.2 Usar el Playwright MCP para explorar antes de escribir el spec

El MCP `playwright` (instalado a nivel user, `npx @playwright/mcp@latest`) expone tools como `mcp__playwright__browser_navigate`, `browser_snapshot`, `browser_click`, `browser_fill_form`, `browser_evaluate`, `browser_resize`, `browser_take_screenshot`, etc.

**Workflow obligatorio** antes de escribir un `.spec.ts` nuevo:

1. **Levantar la app local** (`npm run dev`) o usar la build de preview.
2. **Abrir el flujo con el MCP** (`mcp__playwright__browser_navigate` a la ruta de la story).
3. **Capturar el snapshot accesible** (`browser_snapshot`) para descubrir los roles/labels/test-ids reales que existen en el DOM renderizado. No inventar selectores: leerlos del snapshot.
4. **Recorrer el happy path y los edge cases manualmente** con las tools del MCP. Validar que el estado responde como dice el AC.
5. **Repetir el recorrido en viewport mobile** (`browser_resize` a `375x667`, o navegar emulando `Pixel 5`) para confirmar que el mismo flujo funciona y los selectores siguen siendo válidos.
6. **Recién entonces** escribir el `.spec.ts` reutilizando los selectores que el snapshot confirmó. Si un selector no aparece en el snapshot, **no se usa**: pedir agregar `data-testid` o `aria-label` en el componente primero.

Esto evita la patología típica: tests que pasan porque hacen `waitForTimeout` y nunca tocan el elemento real, o que rompen al primer cambio de markup porque dependen de CSS frágil.

> Si la skill arranca en un entorno sin app levantada, **levantar el server primero** (`npm run dev` en background) antes de invocar el MCP. No simular flujos sin server real corriendo.

### 4.5 Comandos

```bash
npm run test           # Vitest unit + integration (rápido)
npm run test:watch     # Vitest watch mode (durante dev)
npm run test:coverage  # Vitest con reporte de coverage
npm run test:e2e       # Playwright E2E (lento, requiere build) — corre chromium + mobile-web
npm run test:e2e -- --project=chromium     # solo desktop
npm run test:e2e -- --project=mobile-web   # solo mobile
npm run test:e2e:ui    # Playwright UI mode (para debug)
npm run test:ci        # Lo que corre la CI (lint + types + unit + integration + build + e2e)
npm run lint
npm run typecheck      # tsc --noEmit
npm run build
```

**Antes de pushear**: correr al menos `npm run test:coverage` y `npm run typecheck` localmente.

---

## 5. Commits — Conventional Commits

```
feat(E02): implementar extract_with_ia con FoundryProvider
fix(E04): corregir orden del listado por createdAt desc
test(E03): cubrir tabla de verdad de compute_risk
docs(E01): documentar caso de PDF multipage
refactor(lib/ai): extraer stripJsonFences a helper
chore: actualizar dependencia openai a 4.x
```

Un commit por concepto. Preferí 3 chicos a 1 grande.

---

## 6. Pull Request — template y cierre automático

### 6.1 Branch up-to-date con main

```bash
git fetch origin
git rebase origin/main
git push --force-with-lease
```

### 6.2 Template del PR

Auto-completado por `.github/pull_request_template.md`:

```markdown
Closes AB#<id de la US en ADO>

## Qué hace

Una o dos oraciones explicando el cambio funcional.

## Cómo probarlo manualmente

1. ...
2. ...

## Acceptance criteria cubiertos

- [x] Escenario 1: <nombre> → `tests/unit/foo.test.ts`
- [x] Escenario 2: <nombre> → `tests/integration/bar.test.ts`
- [x] Escenario 3: <nombre> → `tests/e2e/baz.spec.ts`

## Casos borde testeados

- [x] <caso del spec §"Casos borde">
- [x] <caso del spec §"Casos borde">

## Coverage

- `src/lib/<modulo>`: X% lines, Y% branches (target ≥80/75)

## Follow-ups (opcional)

- Refactor Z para US futura
```

**El `Closes AB#<id>`** dispara `ado-sync.yml` para cerrar el work item al mergear. Si el PR cubre varias US, una línea por cada una.

### 6.3 Required checks (CI)

- `lint` (ESLint + Prettier check)
- `typecheck` (`tsc --noEmit`)
- `unit-tests` con coverage threshold
- `integration-tests`
- `build` (`next build`)
- `e2e` (Playwright, solo en PRs a `main`)

Cualquiera rojo → PR bloqueado.

---

## 7. Post-merge — cierre del work item

**Sin acción manual.** `ado-sync.yml` parsea el body del PR mergeado, encuentra los `Closes AB#<id>` y transiciona cada work item a `Closed` con un comentario que linkea al PR.

Si la action falla (típicamente PAT vencido):

1. Regenerar PAT en ADO con scope `Work Items: Read, Write & Manage`.
2. Actualizar secret `ADO_PAT` en `Settings → Secrets → Actions`.
3. Re-correr el workflow desde la UI (no hace falta re-mergear).

Para cerrar manualmente (uso ad-hoc): `python3 docs/backlog/scripts/azure_devops_close.py US-XX --pr <url>`.

---

## 8. Definition of Done

Antes de marcar una US como cerrada:

- [ ] Todos los escenarios Gherkin tienen test verde.
- [ ] Todos los casos borde del spec tienen test verde.
- [ ] Coverage de `src/lib/**` ≥80% lines / ≥75% branches.
- [ ] Tests de **front (unit + integration)** agregados donde la implementación los justifica (componente, hook, página, store) — no solo tests de back.
- [ ] E2E corre verde tanto en `--project=chromium` como en `--project=mobile-web`.
- [ ] Antes de escribir cada E2E nuevo, el flujo se exploró con el Playwright MCP y los selectores salen del snapshot real (no inventados).
- [ ] El PR mergeó a `main` con todos los checks verdes.
- [ ] El work item en ADO pasó a `Closed`.
- [ ] No hay regresiones (todos los tests previos siguen verdes).
- [ ] Si tocó API/schema: spec actualizado en el mismo PR.
- [ ] Si tocó UI: probada manualmente en mobile (`<768px`) y desktop (`≥1024px`).
- [ ] Sin TODOs, `console.log`, `debugger`, ni dead code en el merge.

---

## 9. Cuándo NO usar este playbook

- **Hotfix de prod**: rama `hotfix/...`, proceso acelerado.
- **Docs puros** (`docs/...`): no requieren tests ni cierre de work items.
- **Spike / investigación**: rama `spike/...`, no se mergea, se descarta.
- **Bootstrap / cambios estructurales**: documentar bien en PR, seguir igual.

---

## 10. Recursos clave

| Recurso              | Path                                                       |
| -------------------- | ---------------------------------------------------------- |
| Product Brief        | `docs/backlog/product-brief.md`                            |
| Épicas               | `docs/backlog/epics.md`                                    |
| User stories         | `docs/backlog/stories/E0X-*.md`                            |
| Spec overview        | `docs/specs/00-overview.md`                                |
| Specs por épica      | `docs/specs/E0X-*.md`                                      |
| Wireframes           | `docs/wireframes/{desktop,mobile}/*.png`                   |
| Design system        | `docs/design-system/*.png`                                 |
| Variables de entorno | `.env.example` (template), `.env.local` (real, gitignored) |
