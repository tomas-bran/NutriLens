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

## 1.5. Marcar el work item como "En progreso" en Azure DevOps

**Apenas se confirma que se va a tomar la story** (después de leer la US y antes de crear la branch), Claude debe:

1. **Asignar el work item al usuario** (`System.AssignedTo`).
2. **Transicionar el estado** a "Active" / "Committed" / "Doing" / "In Progress" (probamos en ese orden — depende del process template del proyecto, igual que hace `ado-sync.yml` para cerrar).

Esto da visibilidad en el board de quién está agarrando qué, evita doble asignación, y empieza a contar tiempo de ciclo.

### 1.5.1 Pre-requisitos (una vez por máquina)

Exportar en el shell (idealmente en `~/.zshrc` / `~/.bashrc`):

```bash
export AZURE_DEVOPS_PAT="<PAT con scope Work Items: Read, Write & Manage>"
```

El email del asignado se busca primero en memory (`user_ado_identity.md`) — si no existe, **preguntárselo al usuario y guardarlo** antes de seguir.

### 1.5.2 Obtener el AB# id

El AB# id no aparece en `docs/backlog/stories/`. Opciones para obtenerlo:

- **El usuario lo provee** al disparar la story: `"implementemos US-21 AB#123"` → Claude usa `123`.
- **Si no lo provee**, preguntárselo antes de seguir. No inventar IDs.

### 1.5.3 Comando

```bash
ADO_ORG=tbranchesi
ADO_PROJECT=NutriLens
ID=<AB#-id-numérico>
ASSIGNEE=<email del usuario en ADO>

AUTH=$(printf ":%s" "$AZURE_DEVOPS_PAT" | base64)
API="https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/_apis/wit/workitems/${ID}?api-version=7.0"

# Probar estados en orden — el primero que devuelva 200 gana.
for STATE in "Active" "Committed" "Doing" "In Progress"; do
  CODE=$(curl -sS -o /tmp/ado-resp.json -w "%{http_code}" -X PATCH "$API" \
    -H "Authorization: Basic ${AUTH}" \
    -H "Content-Type: application/json-patch+json" \
    -d "[
      {\"op\":\"add\",\"path\":\"/fields/System.AssignedTo\",\"value\":\"${ASSIGNEE}\"},
      {\"op\":\"add\",\"path\":\"/fields/System.State\",\"value\":\"${STATE}\"}
    ]")
  if [ "$CODE" = "200" ]; then
    echo "✓ AB#${ID} asignado a ${ASSIGNEE} y movido a '${STATE}'."
    break
  fi
done

if [ "$CODE" != "200" ]; then
  echo "::warning::No pudimos transicionar AB#${ID}. Último HTTP ${CODE}:"
  cat /tmp/ado-resp.json
fi
```

**Manejo de fallos**:

- **HTTP 401 / 403**: PAT vencido o sin scope. Pedirle al usuario que regenere el PAT y actualice `AZURE_DEVOPS_PAT`.
- **HTTP 404**: el AB# id no existe. Validar con el usuario.
- **HTTP 400 con "Invalid State Transition"**: el flujo del work item no permite saltar al estado pedido (típicamente "Active" desde "Resolved"). Mover primero a "New" / "Approved" y reintentar.
- **Ningún estado funciona**: avisar al usuario y seguir igual con la implementación — el board queda desactualizado pero no es bloqueante.

> Si `AZURE_DEVOPS_PAT` no está exportado, **no hacer la transición silenciosamente** — avisar al usuario y preguntarle si quiere seguir sin actualizar ADO (caso típico: trabajando offline o en una máquina nueva).

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

#### 4.4.3 Page Object Model (POM) — obligatorio en E2E

**Regla dura**: ningún `.spec.ts` puede referenciar locators directamente. Toda interacción con la página pasa por un **Page Object** que vive en `tests/e2e/pages/`. El test describe el QUÉ del flujo; el Page Object encapsula el CÓMO (selectores, esperas, normalización del DOM).

Prohibido en `.spec.ts`:

```ts
// ❌ NO — locator inline en el test
await page.getByRole('button', { name: 'Analizar' }).click();
await expect(page.locator('[data-testid="result-card"]')).toBeVisible();
await page.getByLabel('Subir foto').setInputFiles('fixture.jpg');
```

Obligatorio:

```ts
// tests/e2e/pages/upload-page.ts
import type { Page, Locator } from '@playwright/test';

export class UploadPage {
  private readonly fileInput: Locator;
  private readonly analyzeButton: Locator;
  private readonly resultCard: Locator;

  constructor(private readonly page: Page) {
    this.fileInput = page.getByLabel('Subir foto');
    this.analyzeButton = page.getByRole('button', { name: 'Analizar' });
    this.resultCard = page.getByTestId('result-card');
  }

  async goto() {
    await this.page.goto('/');
  }

  async uploadFixture(filename: string) {
    await this.fileInput.setInputFiles(`tests/e2e/fixtures/${filename}`);
  }

  async submit() {
    await this.analyzeButton.click();
  }

  async expectResultVisible() {
    await this.resultCard.waitFor({ state: 'visible' });
  }
}
```

```ts
// tests/e2e/upload-happy-path.spec.ts
import { test } from '@playwright/test';
import { UploadPage } from './pages/upload-page';

test('analiza una etiqueta válida y muestra el resultado', async ({ page }) => {
  const uploadPage = new UploadPage(page);
  await uploadPage.goto();
  await uploadPage.uploadFixture('galletitas-choco.jpg');
  await uploadPage.submit();
  await uploadPage.expectResultVisible();
});
```

Reglas del POM:

- **Un Page Object por pantalla/ruta** (`UploadPage`, `HistoryPage`, `ProductDetailPage`, `ChatPage`).
- **Locators son `private readonly`** y se inicializan en el constructor.
- **Los métodos públicos son verbos del dominio** (`uploadFixture`, `applyCategoriaFilter`, `goToDetail`), no acciones genéricas de Playwright (`clickButton`, `fillInput`).
- **Aserciones de UI también encapsuladas** (`expectResultVisible`, `expectEmptyState`, `expectErrorBanner('image_not_supported')`). El test queda libre de `expect(...).toBeVisible()` directos sobre locators.
- **Componentes reusables** (header, sidebar, error banner) van en `tests/e2e/components/` como mini Page Objects compuestos.
- **Si un selector aparece en dos Page Objects distintos**, es señal de que pertenece a un componente compartido — refactorizarlo a `tests/e2e/components/`.

Beneficio: cuando un `data-testid` o un label cambia en la UI, **se toca un solo archivo** (el Page Object), no decenas de `.spec.ts`. Y los tests se leen como user journeys, no como instrucciones de DOM.

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

### 6.2 Creación del PR — Claude lo abre con `gh`

**El PR lo crea siempre Claude**, no el usuario. La CLI `gh` está instalada (`gh 2.92.0+`) y autenticada contra el repo. Después de pushear la branch, abrir el PR inmediatamente con `gh pr create`, pasando el body del template completo vía HEREDOC para preservar formato y saltos de línea:

```bash
gh pr create \
  --base main \
  --head feat/US-XX-<slug> \
  --title "feat(US-XX): <título corto del cambio>" \
  --body "$(cat <<'EOF'
Closes AB#<id de la US en ADO>

## Qué hace
...
EOF
)"
```

Reglas:

- **Título**: Conventional Commits con scope `(US-XX)` o `(E0X)` si el PR cubre varias stories. Bajo 70 caracteres. Sin punto final.
- **Body**: copiar el template de §6.3 y completarlo. Pegar la línea `Closes AB#<id>` aunque no se conozca el id — el usuario lo reemplaza antes de mergear o lo agrega como follow-up.
- **No usar `gh pr create --fill`**: arrastra el último commit y se pierde el template estructurado.
- **No agregar `--draft`** salvo que el usuario lo pida explícitamente — el flujo default es PR ready-for-review.
- **Devolver siempre la URL del PR** al usuario al final del turn (la imprime `gh pr create` en stdout).

Si `gh pr create` falla por falta de auth, pedirle al usuario que corra `gh auth login` — no intentar workarounds con tokens.

### 6.3 Template del PR

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

## 7. Post-merge — cierre del work item (move to Done)

**Sin acción manual.** Cuando el PR se mergea, `ado-sync.yml` parsea el body buscando `Closes AB#<id>` y transiciona cada work item a su estado final (`Closed` / `Done` / `Resolved`, probando en ese orden según el process template). Agrega un comentario en el work item con el link al PR.

Esto cierra el loop que abrió §1.5: al inicio de la story Claude movió el ticket a "Active"/"In Progress"; al mergear, el workflow lo mueve a "Done". Claude **no** corre nada en este paso — pero sí debe **verificar que el comentario "✅ Work items cerrados" aparezca en el PR** después del merge, y si no aparece, debug igual que abajo.

Si la action falla (típicamente PAT vencido):

1. Regenerar PAT en ADO con scope `Work Items: Read, Write & Manage`.
2. Actualizar secret `ADO_PAT` en `Settings → Secrets → Actions`.
3. Re-correr el workflow desde la UI (no hace falta re-mergear).

Cierre manual ad-hoc (mismo patrón curl que §1.5 pero con `System.State=Closed`):

```bash
ID=<AB#-id>
AUTH=$(printf ":%s" "$AZURE_DEVOPS_PAT" | base64)
for STATE in "Closed" "Done" "Resolved"; do
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X PATCH \
    "https://dev.azure.com/tbranchesi/NutriLens/_apis/wit/workitems/${ID}?api-version=7.0" \
    -H "Authorization: Basic ${AUTH}" \
    -H "Content-Type: application/json-patch+json" \
    -d "[{\"op\":\"add\",\"path\":\"/fields/System.State\",\"value\":\"${STATE}\"}]")
  [ "$CODE" = "200" ] && echo "✓ AB#${ID} → ${STATE}" && break
done
```

---

## 8. Definition of Done

Antes de marcar una US como cerrada:

- [ ] Todos los escenarios Gherkin tienen test verde.
- [ ] Todos los casos borde del spec tienen test verde.
- [ ] Coverage de `src/lib/**` ≥80% lines / ≥75% branches.
- [ ] Tests de **front (unit + integration)** agregados donde la implementación los justifica (componente, hook, página, store) — no solo tests de back.
- [ ] E2E corre verde tanto en `--project=chromium` como en `--project=mobile-web`.
- [ ] Antes de escribir cada E2E nuevo, el flujo se exploró con el Playwright MCP y los selectores salen del snapshot real (no inventados).
- [ ] Cada `.spec.ts` accede a la página únicamente a través de un Page Object (`tests/e2e/pages/`). Cero locators inline, cero `expect(...)` directos sobre locators en el test (§4.4.3).
- [ ] El PR lo abrió Claude con `gh pr create` (no el usuario manualmente) y la URL quedó devuelta al final del turn (§6.2).
- [ ] Al **arrancar** la story, Claude asignó el work item al usuario y lo movió a "Active"/"In Progress" vía la REST API de ADO (§1.5).
- [ ] El PR mergeó a `main` con todos los checks verdes.
- [ ] Al **mergear**, el comentario "✅ Work items cerrados en Azure DevOps" apareció en el PR (cierre automático de `ado-sync.yml`, §7). Si no apareció, debuggear PAT/secret.
- [ ] El work item en ADO pasó a `Closed`/`Done`/`Resolved`.
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
