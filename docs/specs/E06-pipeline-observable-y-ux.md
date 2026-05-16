# Spec E06 — Pipeline observable y experiencia de uso

> Spec de la épica E06. Define el modelo del `pipelineTrace`, su renderizado en UI, los tokens del design system, los breakpoints responsive y el seed de datos para la demo.

**User stories cubiertas:** US-33, US-34, US-35, US-36, US-37, US-38, US-39.
**Depende de:** [`00-overview.md`](./00-overview.md), todas las épicas previas (consume sus traces).

---

## 1. Goals & Non-goals

**Goals**

- Hacer visible cómo trabaja el sistema mostrando el pipeline del análisis paso a paso.
- Mostrar el JSON crudo extraído por la IA en una sección colapsable.
- Aplicar el design system (tokens, componentes) consistentemente en todas las pantallas.
- Hacer la app responsive (mobile + desktop) siguiendo los wireframes.
- Mantener tiempos de análisis razonables para la demo (objetivo p95 < 20s).
- Tener un dataset mockeado para que la demo nunca dependa de la IA en vivo.

**Non-goals**

- Animaciones complejas / micro-interacciones avanzadas.
- Modo oscuro (post-MVP, los tokens lo permiten pero no lo activamos).
- Internacionalización (post-MVP, todo en español rioplatense).

---

## 2. `pipelineTrace` — modelo y persistencia

### 2.1 Tipos

```ts
// packages/schemas/pipeline.ts
export const StepNameSchema = z.enum([
  'validate_file',
  'detect_label_kind',
  'extract_with_ia',
  'validate_schema',
  'apply_rules',
  'compute_risk',
  'generate_explanation',
  'persist',
]);

export const StepStatusSchema = z.enum(['ok', 'skipped', 'error']);

export const StepTraceSchema = z.object({
  name: StepNameSchema,
  status: StepStatusSchema,
  startedAt: z.string().datetime(),
  durationMs: z.number().int().min(0),
  details: z.record(z.unknown()).optional(),
});

export const PipelineTraceSchema = z.array(StepTraceSchema);
```

### 2.2 Construcción del trace

Cada step (definido en sus respectivas épicas) registra un `StepTrace` en `ctx.steps`. Un helper:

```ts
// lib/pipeline/trace.ts
export function trace(
  ctx: AnalysisContext,
  name: StepName,
  status: StepStatus,
  details?: Record<string, unknown>,
): AnalysisContext {
  const startedAt = ctx.lastStepStartedAt ?? new Date().toISOString();
  const durationMs = Date.now() - new Date(startedAt).getTime();
  return {
    ...ctx,
    steps: [...(ctx.steps ?? []), { name, status, startedAt, durationMs, details }],
    lastStepStartedAt: new Date().toISOString(),
  };
}
```

### 2.3 Persistencia

El array se guarda como `pipelineTrace` (JSON serializado) en la tabla `Product` (ver E04 §2). Se devuelve en `GET /api/products/[id]` y como parte de la respuesta de `POST /api/analyze`.

---

## 3. UI del pipeline visible (US-33)

### 3.1 Componente `<PipelineTrace>`

Ubicación: dentro de la pantalla de resultado y de detalle de producto, debajo del bloque de "JSON extraído".

Renderizado:

```
┌────────────────────────────────────────────────────────────┐
│ Pipeline del análisis                              [▾]     │
├────────────────────────────────────────────────────────────┤
│ ✓ Validar archivo              ok       12 ms              │
│ ✓ Detectar etiqueta            ok      843 ms              │
│ ✓ Extracción con IA            ok    4 215 ms              │
│ ✓ Validar JSON                 ok        3 ms              │
│ ✓ Aplicar reglas               ok        1 ms              │
│ ✓ Calcular riesgo              ok        1 ms              │
│ ✓ Generar explicación          ok    1 102 ms              │
│ ✓ Persistir                    ok      125 ms              │
├────────────────────────────────────────────────────────────┤
│ Total: 6 302 ms                                            │
└────────────────────────────────────────────────────────────┘
```

### 3.2 Estados visuales por status

| `status` | Icono | Color |
|----------|-------|-------|
| `ok`     | `✓`   | `--color-success` (verde) |
| `skipped`| `–`   | `--color-muted` (gris) |
| `error`  | `✗`   | `--color-danger` (rojo) |

Si algún step es `error`, el mismo step muestra el mensaje de `details.error`/`details.reason` en una línea adicional.

### 3.3 Naming amigable

Los `StepName` técnicos se mapean a labels en español dentro del componente:

```ts
const STEP_LABELS: Record<StepName, string> = {
  validate_file: 'Validar archivo',
  detect_label_kind: 'Detectar etiqueta',
  extract_with_ia: 'Extracción con IA',
  validate_schema: 'Validar JSON',
  apply_rules: 'Aplicar reglas',
  compute_risk: 'Calcular riesgo',
  generate_explanation: 'Generar explicación',
  persist: 'Persistir',
};
```

### 3.4 Colapsable

Por default cerrado en mobile, abierto en desktop (`md` y arriba). Estado controlado por `useState` local; **no** persistimos preferencia.

---

## 4. Sección "JSON extraído" (US-34)

### 4.1 Componente `<JsonViewer>`

```
┌────────────────────────────────────────────────────────────┐
│ JSON extraído                              [📋 Copiar] [▾] │
├────────────────────────────────────────────────────────────┤
│ {                                                          │
│   "producto": "Galletitas Choco Crunch",                   │
│   "categoria": "galletitas",                               │
│   "ingredientes_detectados": [...],                        │
│   ...                                                      │
│ }                                                          │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Comportamiento

- **Colapsado por default** en ambas resoluciones.
- Sintaxis resaltada (libs livianas como `prismjs` con solo el lenguaje `json`).
- Botón "Copiar" → copia al clipboard con `navigator.clipboard.writeText`. Feedback visual ("Copiado!" durante 2s).
- Fuente del JSON: `jsonRaw` del producto guardado (o el resultado de la pantalla de análisis post-upload).

---

## 5. Design system — tokens (US-37)

### 5.1 Archivos

```
tokens/
├── colors.css          ← variables de color
├── typography.css      ← tipografía y escala
├── spacing.css         ← espaciados base
└── radii.css           ← bordes redondeados
```

Todos importados en `app/globals.css`.

### 5.2 Tokens canónicos

```css
/* tokens/colors.css */
:root {
  /* base */
  --color-bg:                #FFFFFF;
  --color-surface:           #F7F8FA;
  --color-text:              #1A1F2E;
  --color-text-muted:        #6B7280;
  --color-border:            #E4E7EC;

  /* brand */
  --color-primary:           #2EB67D;   /* verde NutriLens */
  --color-primary-strong:    #1F8E60;
  --color-primary-soft:      #E6F5EE;

  /* feedback */
  --color-success:           #2EB67D;
  --color-warning:           #F2A526;
  --color-danger:            #E5484D;
  --color-info:              #3B82F6;
  --color-muted:             #9CA3AF;

  /* riesgo (alineado con E03 §6.2) */
  --color-risk-low:          var(--color-success);
  --color-risk-medium:       var(--color-warning);
  --color-risk-high:         var(--color-danger);

  /* aptitud (badges ✓/✗) */
  --color-apt-true:          var(--color-success);
  --color-apt-false:         var(--color-danger);
}

/* tokens/typography.css */
:root {
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --fs-xs: 0.75rem;
  --fs-sm: 0.875rem;
  --fs-md: 1rem;
  --fs-lg: 1.125rem;
  --fs-xl: 1.375rem;
  --fs-2xl: 1.75rem;
  --fs-3xl: 2.25rem;

  --fw-regular: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;
}

/* tokens/spacing.css */
:root {
  --sp-0: 0;
  --sp-1: 0.25rem;
  --sp-2: 0.5rem;
  --sp-3: 0.75rem;
  --sp-4: 1rem;
  --sp-6: 1.5rem;
  --sp-8: 2rem;
  --sp-12: 3rem;
  --sp-16: 4rem;
}

/* tokens/radii.css */
:root {
  --r-sm: 4px;
  --r-md: 8px;
  --r-lg: 12px;
  --r-xl: 16px;
  --r-full: 9999px;
}
```

> Los valores exactos pueden ajustarse al implementar mirando los screenshots en `/docs/design-system`. Esta sección define el contrato; los hex finales se confirman al armar el kit.

### 5.3 Componentes base en `components/ui/`

| Componente | API mínima | Uso |
|-----------|-----------|----|
| `<Button variant="primary" \| "ghost" \| "danger">` | `onClick`, `disabled`, `children`, `size?: "sm"\|"md"\|"lg"` | CTA, secundarios |
| `<Card>` | `children`, `padding?` | Contenedor con bordes redondeados y sombra suave |
| `<Badge variant="risk-low" \| "risk-medium" \| "risk-high" \| "neutral">` | `children` | Riesgos, categorías |
| `<Chip onClick?, removable?>` | `children` | Filtros, alérgenos, productos referenciados en chat |
| `<Disclaimer>` | sin props | Frase fija "NutriLens es un asistente informativo…" |
| `<ErrorState title, description, action>` | — | Vista de error reusable |
| `<EmptyState illustration, title, description, action>` | — | Estado vacío reusable |
| `<Spinner size?>` | — | Loading inline |
| `<Skeleton width, height>` | — | Loaders de listado |

---

## 6. Responsive (US-36)

### 6.1 Breakpoints (Tailwind defaults)

| Nombre | Ancho | Uso |
|--------|-------|----|
| `sm`   | 640px | mobile landscape |
| `md`   | 768px | tablet portrait |
| `lg`   | 1024px | desktop chico |
| `xl`   | 1280px | desktop estándar |
| `2xl`  | 1536px | desktop grande |

### 6.2 Layout principal

```
< 768px:    bottom navigation bar (Inicio, Historial, Chat)
≥ 768px:    top navigation bar
≥ 1024px:   container max-width 1024px centrado
```

### 6.3 Reglas por pantalla

| Pantalla | Mobile | Desktop |
|---------|--------|--------|
| Home | hero + CTA + ejemplos en columna | hero a la izquierda + imagen de demo a la derecha |
| Upload | dropzone full-width + CTA "Tomar foto" | dropzone más ancha + drag&drop activo |
| Resultado | secciones apiladas; pipeline cerrado por default | dos columnas (izquierda info, derecha imagen) |
| Historial | tarjetas en 1 columna | grilla de 2 columnas (`lg`) o 3 (`xl`) |
| Chat | thread full-width; input fijo al bottom | layout centrado, max-width 720px |

### 6.4 Touch targets

Mínimo 44×44 px en mobile para botones y chips. Verificación manual con DevTools.

---

## 7. Estados consistentes (US-35)

### 7.1 Loading

- **Inline:** `<Spinner size="sm" />` cuando la operación es < 1s esperado.
- **Skeleton:** para listados (`<HistorySkeleton />`, `<DetailSkeleton />`).
- **Progress:** barra real solo en upload de archivo (XHR progress, ver E01 §7).

### 7.2 Error

Componente `<ErrorState>` con shape:

```tsx
<ErrorState
  icon="alert-triangle"
  title="Algo salió mal"
  description="No pudimos procesar tu pedido. Probá de nuevo en unos segundos."
  primaryAction={{ label: 'Reintentar', onClick: retry }}
  secondaryAction={{ label: 'Volver', onClick: back }}
/>
```

Se reusa en todas las pantallas. El mapeo de `error code → título/descripción` vive en `lib/errors/ui-mapping.ts`.

### 7.3 Empty

Componente `<EmptyState>` análogo, con ilustración opcional.

---

## 8. Seed dataset (US-38)

### 8.1 Archivo `prisma/seed.ts`

Carga 25 productos cubriendo:

| Categoría | Cantidad | Distribución de riesgo |
|----------|---------|----------------------|
| galletitas | 5 | 2 alto, 2 medio, 1 bajo |
| cereales | 4 | 1 alto, 2 medio, 1 bajo |
| snacks | 4 | 2 alto, 1 medio, 1 bajo |
| lácteos | 3 | 1 alto, 1 medio, 1 bajo |
| bebidas | 3 | 1 alto, 1 medio, 1 bajo |
| sin TACC | 3 | 0 alto, 1 medio, 2 bajo |
| veganos | 3 | 0 alto, 1 medio, 2 bajo |

Cada producto tiene los 11 campos del schema (E04 §2) completos, una imagen placeholder en `/uploads/seed/*.jpg` y un `jsonRaw` realista.

### 8.2 Script

```bash
npm run seed              # corre prisma db seed
npm run seed:reset        # borra todo y vuelve a seedear
```

### 8.3 Datos invariantes

- IDs estables (UUID hardcodeados) → permiten que los tests E2E se basen en ellos.
- `createdAt` con offsets desde "ahora" para que el orden del historial sea predecible.
- Imágenes commiteadas en `/public/uploads/seed/` (sí entran en git, son livianas).

---

## 9. Tiempo de análisis razonable (US-39)

### 9.1 Objetivo

- p95 del flujo completo `POST /api/analyze` < **20 segundos**.
- p50 ≈ 5–8 segundos.

### 9.2 Medición

Cada step ya loguea `durationMs`. El total se calcula como `sum(steps.durationMs)`.

Endpoint adicional para debug: `GET /api/admin/timings?last=50` devuelve histograma agregado. **No expuesto en UI; solo para el equipo.**

### 9.3 Mitigaciones si superamos el umbral

- Reducir `max_tokens` del extract si la imagen es chica.
- Saltear `generate_explanation` y mostrar fallback si p50 sube.
- Activar cache agresivo cuando hagamos múltiples uploads similares en la demo.

### 9.4 Watchdog en UI

Si después de 25s no recibimos respuesta, la UI corta y muestra `ErrorState` con `model_timeout` (consistente con E02 §9).

---

## 10. Accesibilidad mínima

- Contraste de texto ≥ 4.5:1 sobre fondos (verificable con Lighthouse).
- Todos los inputs con `<label>` o `aria-label`.
- Foco visible en botones e inputs (no removemos `:focus-visible`).
- Iconos decorativos con `aria-hidden`.
- `<ErrorState>` y `<EmptyState>` con `role="status"` para que los lectores de pantalla anuncien.

No es una épica de a11y completa, pero el MVP no debería romper lo básico.

---

## 11. Logging desde frontend

Mínimo viable: enviar errores no recuperables a un endpoint `POST /api/client-errors` (futuro). Por ahora `console.error` es suficiente para el MVP.

---

## 12. Tests

**Unit**

- `STEP_LABELS` mapea cada `StepName` (cobertura por enum).
- `<Badge>` aplica clase correcta según variant.
- `mapErrorCodeToUi` devuelve título correcto por código.

**Snapshot**

- `<PipelineTrace>` con un trace fixture de 8 steps (todos ok) → snapshot.
- `<PipelineTrace>` con un step `error` → muestra detalles.

**E2E**

- Tras un análisis, el pipeline aparece colapsable y se expande con click.
- JSON viewer se expande, "Copiar" pone el JSON en el clipboard.
- Tras seed, `/historial` muestra 25 cards.
- En viewport mobile, navegación bottom-bar visible; en desktop top-bar.

---

## 13. Decisiones técnicas y trade-offs

| Decisión | Alternativa descartada | Por qué |
|---------|----------------------|--------|
| Tailwind + CSS vars como tokens | una lib de UI (shadcn, etc.) | scope acotado, control total, sin runtime extra |
| Tokens en CSS vars | tokens en JS/TS | facilita modo oscuro futuro y consistencia con CSS |
| Pipeline visible en UI | solo en logs | requisito explícito del TP (RF-15) + buen showcase de "cómo trabaja el sistema" |
| Seed con UUIDs fijos | UUIDs random en cada seed | tests E2E reproducibles |
| Imágenes de seed commiteadas | descarga al seedear | sin red en seed → más rápido y reproducible |
| Sin streaming de respuestas IA | streaming token-by-token | scope; respuestas son cortas |
| No agregar lib de animaciones | framer-motion | bundle más liviano; CSS transitions alcanzan |

---

## 14. Casos borde

- **Trace con un step `error` pero el flujo terminó ok** (porque era opcional, ej. `generate_explanation`): la UI muestra el `✗` rojo pero NO bloquea — la página principal igual muestra el resultado.
- **`pipelineTrace` ausente en productos viejos** (si refactoreamos): la UI muestra "Pipeline no disponible para este producto".
- **JSON `jsonRaw` muy largo (>50kb)**: lo truncamos a 50kb en el JsonViewer con un texto "Truncado a 50kb. Pedí el original al backend." (no debería pasar con productos típicos).
- **Pantalla en viewport < 320px**: layout no garantizado. Mostramos un banner "Pantalla muy chica" como salvavidas.

---

## 15. Métricas

- Distribución p50/p95/p99 de la duración total del pipeline.
- Distribución por step (cuál es el cuello de botella).
- `client.timeout_rate`.
- `pipelineViewer.opened_rate` (cuántos usuarios lo expanden — proxy de interés en la transparencia).
- Tasa de uso del botón "Copiar JSON".
