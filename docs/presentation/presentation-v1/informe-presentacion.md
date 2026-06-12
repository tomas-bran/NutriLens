# NutriLens — Informe integral para presentación

> Documento maestro pensado como **input para armar slides con Claude Design**.
> Resume qué hace NutriLens, cómo se desarrolló y todo el ciclo de vida de SW
> apoyado en IA. Incluye la paleta de colores oficial del producto para que la
> presentación quede visualmente alineada al app.
>
> Trabajo Práctico Integrador — **Inteligencia Artificial Aplicada** — UNLaM.
> Prof. Damián Montefiori.

---

## 0. Paleta de colores oficial (design tokens)

Fuente de verdad: [`src/tokens/colors.css`](../../src/tokens/colors.css) — espejo 1:1 del archivo Pencil de wireframes. Usar **estos** valores en la presentación para que sea coherente con el producto.

### 0.1 Núcleo de marca (verde "NutriLens")

| Token                    | Hex       | Uso sugerido en slides                              |
| ------------------------ | --------- | --------------------------------------------------- |
| `--color-primary`        | `#16A34A` | Color principal de marca, botones, links, acentos   |
| `--color-primary-strong` | `#15803D` | Hover, títulos en énfasis, contraste sobre claro    |
| `--color-primary-soft`   | `#F0FDF4` | Fondos de chips/badges, hero soft, callouts         |
| `--color-primary-border` | `#86EFAC` | Bordes y separadores con tinte de marca             |
| `--color-accent-lime`    | `#A3E635` | Acento decorativo (scan line, sparkles, highlights) |

### 0.2 Tinta y superficies (neutros)

| Token                | Hex       | Uso                               |
| -------------------- | --------- | --------------------------------- |
| `--color-bg`         | `#FAFBF7` | Fondo general (off-white verdoso) |
| `--color-surface`    | `#F1F5F0` | Cards, paneles, secciones soft    |
| `--color-text`       | `#0F172A` | Texto primario                    |
| `--color-text-muted` | `#64748B` | Texto secundario, captions        |
| `--color-border`     | `#E2E8F0` | Bordes default                    |

Ramp de tinta (slate): `#F1F5F9` · `#E2E8F0` · `#CBD5E1` · `#94A3B8` · `#64748B` · `#334155` · `#0F172A`.

### 0.3 Estados de feedback

| Estado  | Foreground | Background |
| ------- | ---------- | ---------- |
| Success | `#16A34A`  | `#D1FAE5`  |
| Warning | `#F59E0B`  | `#FEF3C7`  |
| Danger  | `#EF4444`  | `#FEE2E2`  |
| Info    | `#3B82F6`  | `#DBEAFE`  |

### 0.4 Riesgo (clave del producto)

Cada nivel tiene su par fg/bg estricto — usarlos siempre juntos para badges/chips.

| Riesgo | FG        | BG        |
| ------ | --------- | --------- |
| Bajo   | `#15803D` | `#DCFCE7` |
| Medio  | `#B45309` | `#FEF3C7` |
| Alto   | `#B91C1C` | `#FEE2E2` |

### 0.5 Aptitud (vegano · celíaco · sin lactosa)

| Aptitud         | Color     |
| --------------- | --------- |
| Apta (true)     | `#16A34A` |
| No apta (false) | `#EF4444` |

### 0.6 Tipografía

- **Sans (cuerpo y UI)**: `Inter`, fallback `system-ui`.
- **Mono (código, JSON, chips técnicos)**: `JetBrains Mono`.
- Escala: `0.75` · `0.875` · `1` · `1.125` · `1.375` · `1.75` · `2.25` rem.
- Pesos usados: 400 / 500 / 600 / 700.
- Para la **slide deck**, la presentación existente usa además `Space Grotesk` para títulos display y un acento `--lime: #C7F04A` — son válidos para Claude Design siempre que se conserve el verde primario `#16A34A`/`#15803D` como dominante de marca.

---

## 1. Resumen ejecutivo (1 minuto)

**NutriLens** es una app web que analiza **etiquetas alimentarias** (foto o PDF) usando **IA multimodal**. En segundos extrae ingredientes, alérgenos, sellos y datos nutricionales; clasifica el producto como **apto/no apto** para tres dietas (vegano, celíaco, sin lactosa); calcula un **riesgo** (bajo/medio/alto) con **reglas propias**; guarda el resultado en un **historial** y permite **chatear con RAG** sobre productos cargados.

**Lo importante para la presentación:**

- El **LLM extrae**, **las reglas clasifican**. Nunca confiamos en el modelo para decidir aptitud o riesgo.
- Pipeline **observable**: cada paso del análisis (validar archivo → detectar etiqueta → IA → schema → reglas → riesgo → explicación → persistir) se muestra al usuario.
- **Plug-n-play de proveedores de IA** (Foundry / Azure OpenAI / OpenAI / Mock) detrás de una sola interface — esto fue clave porque nos permitió **migrar de Phi-4 (que nunca funcionó en Foundry MaaS) a `gpt-5.1` en Azure OpenAI** sin tocar el resto del código.
- **Modelo actual en producción**: `gpt-5.1` vía Azure OpenAI (`IA_PROVIDER=azure-openai`).
- **Mock provider determinista** para que dev y CI nunca gasten crédito.
- **Disclaimers** visibles en resultado y chat: "no es consejo médico".

---

## 2. Problema y usuarios objetivo

### 2.1 Problema

Las etiquetas alimentarias contienen información técnica, extensa y difícil de leer rápido en góndola. Casos cotidianos:

- Una persona **celíaca** necesita confirmar si un producto contiene gluten.
- Una persona **intolerante a la lactosa** necesita detectar derivados lácteos ocultos (caseína, suero, manteca, etc.).
- Un **consumidor general** quiere comparar dos galletitas y elegir la de mejor perfil nutricional.
- Cualquier usuario quiere entender **sellos** del frente del paquete (exceso de azúcar, sodio, grasas).

### 2.2 Usuarios objetivo

| Perfil                        | Necesidad                                                | Caso típico                                             |
| ----------------------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| **Usuario general**           | Entender rápido una etiqueta                             | Saca foto y obtiene un resumen claro                    |
| **Usuario con restricciones** | Detectar incompatibilidades (gluten, lactosa, alérgenos) | Verifica si un producto es apto antes de comprarlo      |
| **Usuario comparador**        | Elegir entre productos ya cargados                       | Pregunta "dame galletitas con mejor perfil nutricional" |

### 2.3 Lo que NutriLens **no** es

- No es diagnóstico médico ni recomendación clínica.
- No reemplaza a un nutricionista.
- No garantiza seguridad médica absoluta.
- No escanea código de barras (queda como bonus futuro).

---

## 3. Alcance del MVP

### 3.1 Dentro del MVP (Must Have)

1. Carga de imagen o PDF de etiqueta alimentaria.
2. Validación de archivo (tipo MIME, tamaño ≤ 10 MB, "¿es etiqueta?").
3. Extracción IA multimodal → JSON estructurado validado con Zod.
4. Clasificación de aptitud (vegano, celíaco, sin lactosa) por **reglas propias**.
5. Cálculo de riesgo (bajo/medio/alto) por **fórmula determinística**.
6. Explicación en lenguaje claro generada por LLM.
7. Persistencia en base + historial filtrable.
8. Chat RAG sobre productos guardados.
9. Pipeline observable (trace de pasos visible en UI).
10. Disclaimer informativo siempre visible.

### 3.2 Fuera del MVP (bonus / futuro)

- Diagnóstico médico personalizado.
- Escaneo obligatorio de código de barras.
- App móvil nativa.
- Registro avanzado de usuarios / planes nutricionales.
- Búsqueda vectorial real (RAG es hoy keyword + filtros).
- Audio resumen, generación sintética de etiquetas.
- Integración masiva con Open Food Facts (hay enriquecimiento opcional ya implementado).

---

## 4. Funcionalidades — qué hace exactamente la app

### 4.1 Pantallas

| Pantalla            | Ruta              | Contenido                                                                                        |
| ------------------- | ----------------- | ------------------------------------------------------------------------------------------------ |
| Home                | `/`               | Hero, "¿Cómo funciona?", ejemplos, card de acceso al historial                                   |
| Analizar (upload)   | `/analizar`       | Dropzone, validación, estados (idle/loading/error), Pipeline Stepper en vivo                     |
| Resultado           | `/analizar/[id]`  | Imagen + riesgo + aptitudes + sellos + ingredientes + explicación + JSON crudo + pipeline trace  |
| Historial           | `/historial`      | Lista con filtros (categoría, riesgo, alérgeno) y chips de estado                                |
| Detalle de producto | `/historial/[id]` | Igual al resultado, navegable desde el historial                                                 |
| Chat RAG            | `/chat`           | Hero, input, thread de mensajes, chips de productos recuperados, tabla comparativa cuando aplica |

### 4.2 Flujo principal (happy path)

1. Usuario sube imagen/PDF en `/analizar`.
2. Validación cliente (tipo + tamaño + hash).
3. `POST /api/analyze` con multipart.
4. Pipeline backend ejecuta sus pasos secuencialmente.
5. Producto guardado en Postgres (con deduplicación por hash de archivo).
6. Usuario es redirigido a `/analizar/[id]` con todos los datos.
7. Producto queda disponible en `/historial` y como contexto del `/chat`.

### 4.3 Tipos de output

Cada análisis devuelve **3 vistas** del mismo dato:

1. **Visual** — badges de riesgo/aptitud, chips de alérgenos y sellos, ingredientes en lista.
2. **Explicación** — 2–3 oraciones en español rioplatense, sin jerga clínica.
3. **JSON crudo + pipeline trace** — para transparencia y debugging.

### 4.4 Schema canónico del producto

```ts
ProductExtractionSchema = z.object({
  producto: z.string().min(1),
  categoria: z.enum([
    'galletitas',
    'cereales',
    'snacks',
    'lácteos',
    'bebidas',
    'sin TACC',
    'veganos',
    'otros',
  ]),
  ingredientes_detectados: z.array(z.string()).default([]),
  alergenos: z.array(z.string()).default([]), // ['gluten','leche','huevo','soja','frutos secos','maní','pescado','crustáceos','sulfitos','sésamo']
  sellos: z.array(z.string()).default([]), // sellos AR: 'exceso en azúcares', 'exceso en sodio', etc.
  apto_vegano: z.boolean(),
  apto_celiaco: z.boolean(),
  apto_sin_lactosa: z.boolean(),
  riesgo: z.enum(['bajo', 'medio', 'alto']),
  confidence: z.number().min(0).max(1),
});
```

---

## 5. Arquitectura técnica

### 5.1 Diagrama de alto nivel

```
┌─────────────────────────┐
│  Frontend (Next 15 SSR) │  Tailwind + design tokens
│  React 19 + TypeScript  │  PipelineStepper, JsonViewer, Chat
└────────────┬────────────┘
             │ multipart / JSON
┌────────────▼────────────┐
│  API Routes (Node 20)   │  /api/analyze · /api/products · /api/chat
│  Zod en los bordes      │  X-Request-Id, errores estructurados
└──────┬─────────────┬────┘
       │             │
       ▼             ▼
┌────────────┐  ┌──────────────────────────────┐
│ Postgres   │  │  Azure OpenAI (actual)       │
│ Prisma 6   │  │  · gpt-5.1 (multimodal+text) │
│ + Storage  │  │                              │
│ (local fs) │  │  Plug-n-play: Mock / Azure   │
└────────────┘  │  OpenAI / Foundry / OpenAI   │
                └──────────────────────────────┘
```

### 5.2 Stack consolidado

| Capa             | Tecnología                                                              |
| ---------------- | ----------------------------------------------------------------------- |
| Frontend         | Next.js 15 (App Router) + React 19 + TypeScript estricto                |
| Styling          | Tailwind 3.4 + CSS variables (design tokens en `src/tokens/`)           |
| Componentes UI   | Kit propio en `src/components/ui` (Button, Card, Badge, Chip, etc.)     |
| Backend          | API Routes de Next.js, runtime `nodejs`                                 |
| Validación       | Zod 3 (schemas compartidos en `src/packages/schemas`)                   |
| ORM              | Prisma 6                                                                |
| DB               | PostgreSQL 16 (Docker en dev, Azure Flexible Server en demo)            |
| Storage imágenes | Filesystem local en dev (`/uploads`) → Azure Blob en demo               |
| IA (actual)      | **Azure OpenAI · `gpt-5.1`** detrás de `IaProvider` (multimodal + text) |
| SDK IA           | `openai@5` apuntando al endpoint OpenAI-compatible de Azure OpenAI      |
| Tests unit/int   | Vitest 3 + happy-dom + Testing Library                                  |
| Tests E2E        | Playwright (chromium-desktop + chromium-mobile)                         |
| Infra dev        | Docker Compose (Postgres + app)                                         |
| CI               | GitHub Actions (lint, typecheck, test+coverage, build, E2E)             |
| Project mgmt     | Azure DevOps (work items con sync automático desde PRs)                 |

### 5.3 Estructura de carpetas

```
src/
├── app/                    Next App Router
│   ├── api/{analyze,products,chat}/   route handlers
│   ├── analizar/[id]/      resultado
│   ├── historial/[id]/     detalle
│   └── chat/               cliente RAG
├── components/
│   ├── ui/                 design system (Button, Card, Badge…)
│   ├── upload/             UploadFlow + state machine
│   ├── result/             vista de análisis (pipeline, JSON, chips)
│   ├── history/            lista + filtros
│   ├── chat/               thread, chips, comparativa
│   └── layout/             AppShell + BottomNav mobile
├── lib/
│   ├── ai/                 IaProvider + prompts versionados
│   ├── pipeline/           AnalysisContext + steps
│   │   └── steps/          validate_file, detect_label_kind, extract_with_ia,
│   │                        validate_schema, apply_rules, compute_risk,
│   │                        generate_explanation, enrich_with_off, persist
│   ├── rules/              normalize + blacklists + apply + risk
│   ├── chat/               retrieve, rank, parse_intent, generate_answer, smalltalk
│   ├── enrichment/         Open Food Facts (datos faltantes)
│   ├── extract/            PDF (pdf-parse, can-read)
│   ├── storage/            interface + LocalStorage
│   ├── upload/             state machine cliente + XHR + hash + validaciones
│   ├── products/           serializers DB↔response + query schema
│   └── api/                helpers de error/headers
├── packages/schemas/       Zod schemas compartidos
└── tokens/                 CSS vars del design system
```

### 5.4 Pipeline de análisis (paso a paso)

```
[Archivo] → validate_file       (MIME, tamaño, hash)
        → detect_label_kind     (LLM rápido: ¿es etiqueta?)
        → extract_with_ia       (gpt-5.1 multimodal → JSON raw, con caché por hash+promptVersion)
        → validate_schema       (Zod, con 1 retry "corrective" si parsea pero falla schema)
        → apply_rules           (puro: gluten/lácteos/origen animal sobre listas negras)
        → compute_risk          (puro: fórmula sellos + alérgenos + reglas)
        → enrich_with_off       (opcional: completa con Open Food Facts)
        → generate_explanation  (gpt-5.1 → 2-3 oraciones)
        → persist               (Prisma upsert por fileHash, guarda imagen y trace)
        → respond               (JSON producto + StepTrace[])
```

- Cada step es una función pura sobre `AnalysisContext` (excepto `extract_with_ia`, `generate_explanation`, `enrich_with_off` y `persist`, que son async).
- Timeouts: 25 s extracción, 10 s chat/explicación; un único reintento con backoff 2 s ante 429/5xx.
- Errores codificados con `{ error, reason, details }` y status HTTP enumerado.

### 5.5 IaProvider — abstracción del modelo

```ts
export interface IaProvider {
  analyzeLabel(
    file,
    mime,
    { promptVersion },
  ): Promise<{ raw: string; usage: TokenUsage; latencyMs: number }>;
  classifyLabelKind(
    file,
    mime,
    { promptVersion },
  ): Promise<{ isLabel: boolean; confidence: number; latencyMs: number }>;
  generateExplanation(
    product,
    { promptVersion },
  ): Promise<{ text: string; usage: TokenUsage; latencyMs: number }>;
  answerWithContext(
    question,
    products,
    { promptVersion },
  ): Promise<{ text: string; usage: TokenUsage; latencyMs: number }>;
  parseIntent(question, { promptVersion }): Promise<{ intent; latencyMs: number }>;
  smalltalk(question, { promptVersion }): Promise<{ text: string; latencyMs: number }>;
}
```

Implementaciones:

- `AzureOpenAIProvider` — **actualmente en uso** (`IA_PROVIDER=azure-openai`). Apunta al endpoint OpenAI-compatible de Azure OpenAI (`/openai/v1`) con el modelo `gpt-5.1` para extracción multimodal, explicación y chat. Un único cliente cubre todos los casos.
- `MockIaProvider` — default en dev y CI. Fixtures deterministas por hash → permite demos sin Azure.
- `FoundryProvider` — implementación contra Azure AI Foundry MaaS (Phi-4). **Quedó como respaldo / referencia**; nunca llegó a funcionar de manera estable en la cuenta Students (ver §6.6.bis).
- `OpenAIProvider` — respaldo directo contra `api.openai.com` si Azure se cae.

Selector único por env `IA_PROVIDER ∈ {mock, foundry, azure-openai, openai}`. CI **siempre** corre `mock` para no gastar crédito.

### 5.6 Prompts versionados

Viven en `src/lib/ai/prompts/` con sufijo `-vN.md` y se cargan inline en build vía `?raw`. **Todos los prompts hoy corren sobre `gpt-5.1`** (un único modelo multimodal + texto cubre los 7 casos; el upgrade desde Phi-4 no requirió tocar los prompts — eso valida la abstracción de proveedor):

| Prompt                          | Modelo actual | Tarea                                             |
| ------------------------------- | ------------- | ------------------------------------------------- |
| `detect_label_kind-v1`          | gpt-5.1       | Pre-filtro barato: ¿la imagen parece etiqueta?    |
| `extract_product-v1`            | gpt-5.1       | Extracción imagen/PDF → JSON producto             |
| `extract_product-v1-corrective` | gpt-5.1       | Reintento si el JSON parsea pero no cumple schema |
| `explain_product-v1`            | gpt-5.1       | Explicación 2–3 oraciones en español rioplatense  |
| `chat_parse_intent-v1`          | gpt-5.1       | Parsea pregunta del chat → intent JSON            |
| `chat_answer-v2`                | gpt-5.1       | Respuesta RAG sobre productos recuperados         |
| `chat_smalltalk-v1`             | gpt-5.1       | Smalltalk cuando el intent no matchea             |

### 5.7 Chat RAG (E05)

Pipeline del chat:

```
Pregunta → parse_intent (LLM) → retrieve (filtros + keywords sobre Postgres)
        → rank (top-K=5 por relevancia)
        → generate_answer (LLM con productos como contexto)
        → respuesta + chips de productos referenciados
```

- Si el intent es ambiguo o no matchea, se enruta a `smalltalk` con un disclaimer informativo.
- Si la pregunta pide comparar (`intent.kind === 'compare'`), se genera una **tabla markdown** comparativa.
- El chat es **stateless por mensaje** y **sandboxeado al historial**: nunca inventa productos.

### 5.8 Persistencia (E04)

Modelo Prisma único `Product` con:

- `fileHash @unique` → deduplicación: subir dos veces el mismo archivo no llama a la IA.
- Enums `Categoria` y `Riesgo` nativos en Postgres.
- Arrays como `JSON.stringify` (decisión simple para MVP; native arrays queda como follow-up).
- `pipelineTrace` y `jsonRaw` guardados como text → habilitan la transparencia del producto.
- Imagen guardada en `/uploads/<hash>.<ext>` con MIME y tamaño persistidos.

### 5.9 Observabilidad

- Cada request lleva un `X-Request-Id` (UUID v4) propagado a logs.
- Eventos clave: `analyze.started/completed/failed`, `chat.answered/no_context`, `rule.applied`, `model.error`.
- Cada call a la IA loguea `provider`, `model`, `promptVersion`, `tokensIn/Out`, `latencyMs`.
- `pipeline_trace` se devuelve al cliente y se renderiza en la UI (stepper + json viewer).

### 5.10 Seguridad y datos

- Sin auth en MVP → no se persisten datos personales.
- Imágenes nombradas por hash, no por usuario.
- `.env.local` gitignored; nunca se commitean keys.
- Sin PII en logs (solo hash de archivo).
- Disclaimer "informativo, no clínico" obligatorio en resultado y en cada respuesta de chat.

---

## 6. Ciclo de vida de SW con IA — cómo lo construimos

> Este es el corazón del informe: explica cómo recorrimos **análisis → diseño → implementación → testing → ops** apoyándonos en IA como herramienta de desarrollo, no solo como feature.

### 6.1 Fase 0 — Encuadre y discovery

**Entregables**:

- `docs/mvp/Consigna-TP-Integrador-IA-Aplicada.pdf` — consigna del TP.
- `docs/mvp/NutriLens-MVP-Documento-Funcional.pdf` — documento funcional.
- `docs/backlog/product-brief.md` — visión, usuarios, riesgos, métricas.

**Decisiones de encuadre**:

- Producto **horizontal** (cualquier usuario con celular) con casos verticales claros (celíacos / intolerantes / comparadores).
- MVP en 2 semanas, equipo de 4 personas.
- El verticalizado de "riesgo" se calcula con **reglas determinísticas propias** para que la app no parezca médica.
- Disclaimer informativo es un **requisito no-funcional bloqueante**.

### 6.2 Fase 1 — Diseño funcional y UX

**Entregables**:

- Wireframes desktop (6 pantallas) y mobile (12 pantallas) — diseñados en **Pencil** (archivo fuente versionado).
- Design system con **tokens** sincronizados entre Pencil y CSS (`src/tokens/colors.css` es espejo 1:1 del panel de variables del Pencil).
- Capturas en `docs/design-system/` y `docs/wireframes/`.

**Decisiones de UX**:

- Mobile-first: el usuario tipo saca foto en góndola.
- Pipeline **visible** al usuario — convertimos un proceso de IA en algo entendible y depurable.
- Riesgo y aptitudes con colores estrictos (paleta sección 0.4 y 0.5).
- Estados intermedios claros (idle / loading / error) en todos los formularios.

### 6.3 Fase 2 — Backlog estructurado para LLM-assisted dev

**Entregables**:

- 7 épicas (E01–E07) en `docs/backlog/epics.md`.
- **42 user stories** en formato **Gherkin** con story points (Fibonacci), distribuidas:
  - E01 Onboarding & Upload — 7 stories · 19 SP
  - E02 Análisis IA multimodal — 8 stories · 29 SP
  - E03 Reglas + riesgo + explicación — 5 stories · 16 SP
  - E04 Persistencia e historial — 6 stories · 18 SP
  - E05 Chat RAG — 6 stories · 23 SP
  - E06 Pipeline observable + UX — 7 stories · 21 SP
  - E07 Quality eval — 3 stories · 16 SP
  - **Total: 42 stories · 142 SP**
- Sync con **Azure DevOps**: cada story es un Work Item, cierre automático vía PR (`Closes AB#NNN`).

**Por qué Gherkin**: cada escenario "Dado / Cuando / Entonces" se convierte en **al menos un test**, y le da al agente LLM (Claude Code) un contrato verificable de qué tiene que implementar.

### 6.4 Fase 3 — Specs SDD por épica

**Entregables**:

- `docs/specs/00-overview.md` — arquitectura, stack, contratos cross-cutting, errores enumerados.
- `docs/specs/E01..E07.md` — un spec por épica con: contratos de API, schemas Zod, pipeline steps, casos borde, decisiones técnicas y diagramas.

**Por qué SDD (Spec-Driven Development)**:

- Los specs son el **contrato compartido** entre humanos y agentes LLM.
- Permiten paralelizar: cuatro personas (y Claude Code) trabajando sobre los mismos contratos sin pisarse.
- Evitan que el LLM "invente" decisiones — si una US contradice el spec, se escala, no se improvisa.

### 6.5 Fase 4 — Bootstrap del proyecto

Sprint 0 (commits `54119a3..b0501e8`):

- Bootstrap Next.js 15 + TypeScript estricto + Tailwind + Prisma.
- Postgres en Docker Compose (`docker-compose.yml`).
- Dockerfile dev (hot reload) + Dockerfile prod (standalone).
- GitHub Actions con 5 jobs: lint, typecheck, test+coverage, build, E2E.
- Branch protection con required checks en `main`.
- Husky + Prettier + ESLint con `--max-warnings 0`.
- Skill propia de Claude Code: `nutrilens-implement-story` con el playbook oficial de implementación.

### 6.6 Fase 5 — Implementación story-by-story con IA

Patrón aplicado **42 veces** (una por US):

1. **Leer la US y el spec** (Gherkin + contratos).
2. **Marcar work item en ADO como "Doing"**.
3. **Crear branch** `feat/US-XX-<slug>`.
4. **Implementar** según AC y spec, sin improvisar.
5. **Escribir tests**: cada escenario Gherkin → al menos un test (unit / integration / E2E según corresponda).
6. **Asegurar coverage**: thresholds ≥ 80% lines / ≥ 75% branches en `src/lib`.
7. **Abrir PR** con body que incluye `Closes AB#NNN` para cerrar el work item al merge.
8. **Pasar CI** (5 jobs) y review.
9. **Merge a main**.

**El agente (Claude Code) acelera cada paso pero no decide**: el equipo aprueba diseño, código y merge. La autoridad sigue siendo el spec.

### 6.6.bis Caso real — Cuando Phi-4 nunca funcionó y migramos a `gpt-5.1`

> Este es un episodio importante para contar en la presentación: **la decisión arquitectónica de abstraer el proveedor de IA pagó dividendos antes incluso de que el MVP estuviera completo**.

**Lo que pasó**:

- Los specs originales (`docs/specs/00-overview.md §2.bis`) eligieron **`Phi-4-multimodal-instruct` + `Phi-4-mini-instruct`** vía **Azure AI Foundry MaaS**. La razón: la cuenta era **Azure for Students** ($100 USD de crédito) y el acceso a Azure OpenAI requería aprobación.
- Implementamos `FoundryProvider` completo (con timeout, retry, error mapping y tests).
- Al intentar usar Phi-4 end-to-end nos chocamos con **KI-02** (`docs/known-issues.md`): las llamadas a `Phi-4-mini-instruct` timeouteaban sin respuesta, aunque la key, el resource y el catálogo respondían OK. Probables causas: deployment MaaS no provisionado para Students, rate-limit oculto, o cuota del modelo en esa región.
- El workaround temporal a `Phi-3.5-vision-instruct` / `Phi-3.5-mini-instruct` tampoco resolvió la calidad de extracción.

**Cómo lo resolvimos**:

1. La **interface `IaProvider`** ya estaba definida desde el día 0 — no fue un refactor reactivo, fue una decisión arquitectónica del spec inicial.
2. Implementamos `AzureOpenAIProvider` siguiendo el mismo contrato.
3. Conseguimos acceso a Azure OpenAI con el modelo **`gpt-5.1`** (deployado en el mismo project de Foundry, pero por el endpoint `openai/v1` directo).
4. Cambio en producción: **una sola variable de entorno** — `IA_PROVIDER=azure-openai` + `AZURE_OPENAI_MODEL_MULTIMODAL=gpt-5.1`.
5. Los **prompts no necesitaron cambios**: el mismo `extract_product-v1.md`, `explain_product-v1.md`, etc., funcionan en `gpt-5.1` con mejor calidad que la que jamás conseguimos sacarle a Phi.

**Lecciones para la presentación**:

- **Diseñar para reemplazar al proveedor desde el primer día** no es over-engineering — es supervivencia cuando uno depende de un servicio externo.
- Los **prompts versionados independientes del modelo** permiten que la migración sea trivial.
- El **`MockIaProvider`** nos permitió seguir desarrollando todo el resto del producto (frontend, persistencia, chat RAG, evals) **mientras** debugueábamos Phi en paralelo. Cero días de blocker para el equipo.
- KI-02 quedó documentado como audit trail honesto: el repo guarda no solo qué funcionó, también qué falló y por qué.

### 6.7 Fase 6 — Estrategia de testing

**Pirámide de tests**:

```
                ▲
               ╱E2E╲       13 specs Playwright
              ╱─────╲      chromium-desktop + chromium-mobile
             ╱  INT  ╲     6 tests de integración
            ╱─────────╲    (API ↔ Postgres real)
           ╱   UNIT    ╲   45 tests unitarios
          ╱─────────────╲  schemas, reglas, sanitizers, hooks, components
```

**Cobertura concreta**:

- **Unit (45 archivos)**: rules (apply, normalize, risk, blacklists, inferencia de alérgenos), schemas Zod, sanitizers (json fences, explanation, chat answer), pipeline steps individuales, upload (state machine, hash, validate, XHR), eval runner (CLI, metrics, reporter), serializers DB↔response.
- **Integration (6 archivos)**: endpoint `/api/analyze` con MockIaProvider y DB real, listing y detalle de productos, chat E2E con productos sembrados, seed dataset.
- **E2E Playwright (13 specs)**: smoke, home, upload happy path, upload rejected, result, pipeline+JSON, history, history-filters, chat-no-context, chat-with-context, chat-compare, chat-error, chat-thread-and-reset. Page Object Model en `tests/e2e/pages/`.

**Coverage gates en CI**: ≥ 80% lines, ≥ 75% branches sobre `src/lib`. El job falla si no se cumple.

### 6.8 Fase 7 — Evaluación cuantitativa del LLM (E07)

**Lo que hace especial este proyecto**: no nos quedamos con tests funcionales, también medimos **calidad del modelo**.

**Harness en `/evals`**:

- Dataset: **15 fotos propias + 10 Open Food Facts + 2-3 PDFs + 10 non-food** (~37 archivos), todos con `expected` JSON.
- Métricas: precision / recall / F1 / exact match por campo (ingredientes, alérgenos, sellos, categoría, aptitudes, riesgo).
- Runner CLI: `npm run eval -- --prompt extract_product-v1 [--filter category=galletitas] [--cache-only] [--compare v1 v2]`.
- Cada corrida genera un **reporte markdown** que se commitea en `evals/results/` como audit trail.
- **No corre en CI** (consume crédito Azure) → cadencia: cada cambio de prompt, provider, modelo o regla.

Beneficio: el equipo puede iterar prompts (v1 → v2) y demostrar cuantitativamente que mejoró. Si una métrica baja, no se mergea.

### 6.9 Fase 8 — DevEx, infra y operación

- **Docker Compose** completo: `docker-compose.yml` con servicio `db` (Postgres 16) y `app` (Next.js dev). `npm run docker:up`.
- **Gotchas documentados** en `DEVELOPMENT.md` con fixes graduales (volúmenes anónimos de `node_modules`, `pdf-parse` y RSC webpack).
- **Seed determinista** con 50 productos (`prisma/seed.ts`) para tener una demo estable sin depender del modelo.
- **Sync ADO ↔ GitHub** automatizado: workflow `.github/workflows/ado-sync.yml` cierra work items al mergear PRs.
- **Audit doc** (`docs/audit-2026-05.md`) con plan de plug-n-play de proveedores y mock dataset realista.

### 6.10 Fase 9 — Polish y demo

- Pulido de UI: AppShell + BottomNav mobile, toasts, JsonViewer con Prism, PipelineStepper animado.
- Datos mock con 50 productos para que la demo no dependa de Azure si el modelo falla.
- Disclaimers visibles en resultado y chat.
- Presentación oral con Reveal.js (`docs/presentation/index.html`) usando paleta y tipografía del producto.

---

## 7. Métricas y resultados

### 7.1 Métricas de proceso

| Indicador                      | Valor                                                       |
| ------------------------------ | ----------------------------------------------------------- |
| Épicas                         | 7                                                           |
| User stories                   | 42                                                          |
| Story points totales           | 142                                                         |
| Story points P0 (MVP mínimo)   | 73                                                          |
| Commits                        | ~133                                                        |
| Pull requests mergeados        | ~28                                                         |
| Líneas de spec (`docs/specs/`) | ~3.5k LoC de markdown                                       |
| Tests unitarios                | 45 archivos                                                 |
| Tests de integración           | 6 archivos                                                  |
| E2E Playwright                 | 13 specs (desktop + mobile)                                 |
| Coverage gate                  | ≥ 80% lines / ≥ 75% branches en `src/lib`                   |
| Jobs CI                        | 5 (lint, typecheck, test+coverage, build, E2E)              |
| Prompts versionados            | 7 (extract, detect_label_kind, explain, chat x3, smalltalk) |

### 7.2 Métricas de producto

- **Modelo en producción**: `gpt-5.1` vía Azure OpenAI (después de descartar Phi-4 — ver §6.6.bis).
- **Tiempo medio de análisis end-to-end**: bajo 5 s con `gpt-5.1` (sin contar caché).
- **Caché hit**: 100% si el mismo archivo se sube dos veces (dedup por `fileHash`).
- **Costo del eval completo**: ~$0.08 USD por corrida (estimado al diseñar con Phi; con `gpt-5.1` el orden es similar pero el plug-n-play del provider permite revertir si hace falta).

### 7.3 Riesgos identificados y mitigaciones

| Riesgo                        | Mitigación implementada                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| El modelo alucina datos       | Schema Zod estricto + retry corrective + reglas propias                                                                         |
| Imagen no es una etiqueta     | Step `detect_label_kind` previo a la extracción cara                                                                            |
| Imagen borrosa / baja calidad | `confidence` reportado + badge "Confianza baja" en UI                                                                           |
| Proveedor de IA caído         | `IaProvider` swappable + Mock determinista + plan plug-n-play                                                                   |
| **Phi-4 (MaaS) no responde**  | **Migración real ejecutada** a `gpt-5.1` (Azure OpenAI) sin cambiar prompts ni código de negocio — solo env vars (ver §6.6.bis) |
| Respuesta parece médica       | Prompt explícito anti-medical + sanitizer + disclaimer obligatorio                                                              |
| CI gasta crédito Azure        | CI usa `IA_PROVIDER=mock` always; eval no corre en CI                                                                           |
| Cuenta Students vence         | Documentado en `docs/known-issues.md` (KI-02) con escape paths                                                                  |

---

## 8. Diferenciales del proyecto (lo que destaca)

1. **Spec-driven development con LLM**: backlog, épicas, specs y stories pensados para acelerar a Claude Code sin perder control humano.
2. **Pipeline observable**: el usuario ve los pasos del análisis, no es una caja negra.
3. **Reglas propias por encima del modelo**: aptitud y riesgo nunca dependen de lo que diga el LLM.
4. **Plug-n-play real de proveedores**: mock / foundry / azure-openai / openai detrás de una sola interface — probado en la práctica al migrar de Phi-4 a `gpt-5.1` sin tocar lógica de negocio.
5. **Mock determinista** que permite demos sin Azure y CI sin gasto.
6. **Eval harness propio** con dataset etiquetado y métricas auditables.
7. **Sync ADO ↔ GitHub** automatizado: el board refleja el código siempre.
8. **Design tokens versionados** entre Pencil y CSS — el diseño no se desincroniza del código.

---

## 9. Roadmap a futuro (post-MVP)

- Integración profunda con **Open Food Facts** (hoy es opcional, podría ser fuente principal).
- **Búsqueda vectorial real** (pgvector) para el RAG.
- **Comparador visual** con métricas lado a lado.
- **Audio resumen** del análisis (text-to-speech).
- **App móvil nativa** (React Native) para mejorar UX en góndola.
- **Auth y multi-tenant** para historial por usuario.
- **Modelo separado de extracción vs. chat** (hoy `gpt-5.1` cubre todo; podríamos usar un mini para chat y reducir costos).
- **Búsqueda por código de barras** (EAN-13) como entrada alternativa.

---

## 10. Estructura sugerida para los slides de Claude Design

Para que la presentación tenga ritmo y respete la paleta:

1. **Cover** — fondo `--color-bg`, título display sobre `--color-text`, dot verde `--color-primary`.
2. **El problema** — 2-3 mockups de etiquetas reales (foto), insight en una línea.
3. **Solución en una frase** — full bleed verde `--color-primary` con texto blanco.
4. **Demo del flujo** — screenshots (`docs/presentation/assets/app-*.png`) en mosaico.
5. **Arquitectura** — diagrama con tokens (verde primario para nodos críticos, gris para infra).
6. **Pipeline observable** — captura del PipelineStepper de la app.
7. **Cómo lo construimos** — timeline horizontal con las 9 fases del ciclo (sección 6).
8. **Testing y eval** — pirámide + screenshot de un reporte de eval.
9. **Métricas** — números grandes sobre `--color-surface`, acento `--color-accent-lime`.
10. **Lo que destaca** — sección 8 como lista de bullets cortos.
11. **Roadmap** — timeline futuro en gris con uno o dos hitos verdes.
12. **Cierre** — disclaimer informativo + equipo + Q&A.

**Reglas de uso de color en slides**:

- Verde primario (`#16A34A`) para acentos críticos y CTAs; no más del 20% de cada slide.
- Verde soft (`#F0FDF4`) para fondos de cards y callouts.
- Riesgo siempre con su par fg/bg de sección 0.4.
- Texto siempre `#0F172A` sobre claro o `#FAFBF7` sobre verde primario.
- El acento lime (`#A3E635` o el `#C7F04A` de la presentación actual) se usa **solo** para "sparkles" sutiles, nunca para tipografía principal.

---

## 11. Recursos del repo para reusar en slides

| Recurso                                          | Para                                          |
| ------------------------------------------------ | --------------------------------------------- |
| `docs/presentation/assets/app-*.png`             | Screenshots reales de la app                  |
| `docs/wireframes/desktop/*.png` + `mobile/*.png` | Wireframes originales del producto            |
| `docs/design-system/*.png`                       | Capturas del design system                    |
| `src/tokens/colors.css`                          | Paleta exacta (sección 0 de este informe)     |
| `docs/specs/*.md`                                | Diagramas y contratos para citar              |
| `docs/backlog/epics.md`                          | Slide de épicas y story points                |
| `evals/results/`                                 | Reportes reales del eval para mostrar         |
| `docs/known-issues.md`                           | Honestidad técnica: qué no funcionó y por qué |

---

## 12. Cierre

**NutriLens** es a la vez un producto y un caso de estudio: muestra que se puede llevar un MVP de IA aplicada del 0 al funcionando en dos semanas, con un equipo de cuatro personas, sin sacrificar rigor de ingeniería (specs, tests, CI, observabilidad) ni honestidad con el usuario (disclaimers, pipeline visible, reglas determinísticas por encima del modelo).

Lo que se presenta no es "una app con IA", es **una app que demuestra cómo se desarrolla software con IA en 2026**: el LLM extrae y explica, las reglas deciden, los specs guían a los agentes, y el equipo aprueba cada merge.

> Disclaimer obligatorio del producto: NutriLens es un **asistente informativo**. No reemplaza a un profesional de nutrición ni garantiza seguridad médica absoluta.
