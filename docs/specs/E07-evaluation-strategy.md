# Spec E07 — Quality assurance and model evaluation

> Defines how we measure whether the AI pipeline produces correct outputs and how we iterate on prompts when it doesn't. Covers dataset, metrics, runner, thresholds and refinement loop.

**User stories cubiertas:** US-40, US-41, US-42.
**Depende de:** [`00-overview.md`](./00-overview.md), [`E02-analisis-multimodal-ia.md`](./E02-analisis-multimodal-ia.md), [`E03-clasificacion-reglas-explicacion.md`](./E03-clasificacion-reglas-explicacion.md), [`E05-chat-rag.md`](./E05-chat-rag.md).

---

## 1. Goals & Non-goals

**Goals**

- Tener un set de casos de prueba real (imágenes + JSON esperado) para medir calidad de extracción.
- Calcular métricas por campo (precision, recall, F1, exact match) en cada corrida del eval.
- Definir thresholds explícitos para MVP y demo.
- Detectar regresiones cuando se cambia un prompt.
- Iterar prompts versionando (`v1`, `v2`, …) con reportes auditables.
- Cubrir los 4 puntos donde llamamos al modelo: extracción multimodal, detección "¿es etiqueta?", explicación, chat RAG.

**Non-goals**

- No reemplaza tests unit/integration — los complementa. Unit valida estructura, eval valida contenido.
- No corre en CI (consumiría crédito de Azure) — se corre on-demand local o nightly schedule opcional.
- No reemplaza QA manual de la demo — es input cuantitativo, no decisión final.

---

## 2. Dataset

### 2.1 Composición (mix 15 propias + 10 de Open Food Facts)

| Bucket | Cantidad | Notas |
|--------|---------|-------|
| Fotos propias del super | 15 | Sacadas con celular, calidades variadas (representativas del usuario real) |
| Open Food Facts (OFF) | 10 | Productos argentinos seleccionados de `world.openfoodfacts.org` (CC) |
| PDFs | 2-3 | Fichas técnicas para validar el flujo PDF |
| Non-food (para `detect_label_kind`) | 10 | Paisajes, gente, capturas, objetos sin etiqueta |

**Total:** ~37 archivos.

### 2.2 Cobertura objetivo

Cada caso tiene tags. La distribución mínima esperada:

| Eje | Requerimiento |
|-----|---------------|
| Categoría producto | al menos 2 casos por cada una de las 7 (galletitas, cereales, snacks, lácteos, bebidas, sin TACC, veganos) |
| Riesgo esperado | ~8 bajo, ~8 medio, ~9 alto |
| Calidad imagen | 60% nítidas, 30% con problemas leves (reflejo, ángulo), 10% borrosas |
| Sellos | 30% sin sellos, 30% con 1 sello, 40% con ≥2 sellos |
| Alérgenos | cada uno de los 10 alérgenos del enum aparece en al menos 1 caso |
| Aptitudes | al menos 3 casos apto vegano, 3 apto celíaco, 3 apto sin lactosa |
| Idioma | 80% español, 20% inglés/portugués |
| Edge cases | al menos 1 caso por cada uno: etiqueta cortada, imagen muy oscura, producto en bolsa transparente |

### 2.3 Estructura

```
evals/
├── README.md
├── dataset/
│   ├── manifest.json                  # índice de todos los casos
│   ├── images/                        # imágenes propias + OFF
│   │   ├── 001-galletitas-oreo.jpg
│   │   ├── 002-leche-la-serenisima.jpg
│   │   └── ...
│   ├── pdfs/
│   │   └── 001-bebida-ficha.pdf
│   └── non-food/                      # para detect_label_kind eval
│       ├── 001-paisaje.jpg
│       ├── 002-screenshot.png
│       └── ...
├── chat/
│   └── intents.json                   # para chat_parse_intent eval
├── runner/
│   ├── run-eval.ts                    # script principal
│   ├── metrics.ts                     # cálculo de precision/recall/F1
│   └── reporter.ts                    # genera el markdown
└── results/                           # reportes commiteados (audit trail)
    ├── extract_product-v1-2026-05-16-14h32.md
    ├── detect_label_kind-v1-2026-05-16-14h32.md
    ├── explain_product-v1-2026-05-16-14h32.md
    └── chat_answer-v1-2026-05-16-14h32.md
```

### 2.4 `manifest.json` schema

```json
[
  {
    "id": "001",
    "file": "images/001-galletitas-oreo.jpg",
    "mime": "image/jpeg",
    "source": "own" | "openfoodfacts",
    "license": "internal" | "CC-BY-SA-3.0" | "...",
    "off_url": "https://world.openfoodfacts.org/product/...",   // si source=openfoodfacts
    "category": "galletitas-con-sellos",
    "tags": ["high-quality", "frontal", "multi-sellos", "es"],
    "expected": {
      "producto": "Oreo",
      "categoria": "galletitas",
      "ingredientes_detectados": ["harina de trigo", "azúcar", "..."],
      "alergenos": ["gluten", "soja"],
      "sellos": ["exceso en azúcares", "exceso en grasas saturadas"],
      "apto_vegano": false,
      "apto_celiaco": false,
      "apto_sin_lactosa": false,
      "riesgo": "alto"
    },
    "notes": "Frontal del paquete, sellos claramente visibles."
  }
]
```

### 2.5 Política de privacidad y licencias

- **Fotos propias:** no contienen PII, son productos de góndola. Las commiteamos en el repo (livianas, JPG comprimido).
- **OFF:** Open Food Facts es Open Database License (ODbL) — las imágenes pueden tener distinta licencia (CC-BY-SA mayoría). Guardamos en `manifest.json` el campo `license` y `off_url`. Si una imagen tiene licencia restrictiva, la excluimos del repo y dejamos solo el URL para fetch on-demand.

---

## 3. Eval runner

### 3.1 Comandos

```bash
# Full eval para un prompt
IA_PROVIDER=foundry npm run eval -- --prompt extract_product-v1

# Filtros
npm run eval -- --prompt extract_product-v1 --filter category=galletitas
npm run eval -- --prompt extract_product-v1 --filter tag=multi-sellos
npm run eval -- --prompt extract_product-v1 --id 001          # solo un caso (debug)

# Comparar dos versiones
npm run eval -- --compare extract_product-v1 extract_product-v2

# Modo offline (sin llamar al modelo, usa últimas respuestas cacheadas)
npm run eval -- --prompt extract_product-v1 --cache-only
```

### 3.2 Flujo del runner

```
[manifest.json] ──► for each case ──► call /api/analyze (o IaProvider directo)
                                      │
                                      ▼
                              parse response
                                      │
                                      ▼
                            compute per-case metrics
                                      │
                                      ▼
                            aggregate across cases
                                      │
                                      ▼
                       write markdown report to evals/results/
                                      │
                                      ▼
                       check thresholds → exit 0 / 1
```

### 3.3 Caching de respuestas

- Cada llamada al modelo se guarda en `evals/.cache/<sha-input>.json` (gitignored).
- Re-corridas con el mismo prompt + mismo input → cache hit, no consume tokens.
- Útil para iterar las **métricas** sin tocar las respuestas del modelo.
- Flag `--no-cache` fuerza re-correr.

---

## 4. Métricas por prompt

### 4.1 `extract_product-v*`

Por campo del JSON:

| Field | Métrica | Cómo se calcula |
|-------|---------|-----------------|
| `producto` | Fuzzy match | Levenshtein normalizada, threshold 0.7 cuenta como match |
| `categoria` | Exact match | 1 si igual, 0 si no |
| `ingredientes_detectados` | F1 sobre sets | `2*precision*recall / (precision+recall)` |
| `alergenos` | F1 sobre sets | idem |
| `sellos` | F1 sobre sets | idem |
| `apto_vegano`, `apto_celiaco`, `apto_sin_lactosa` | Exact match | 1 si igual booleano |
| `riesgo` (después de reglas) | Exact match | 1 si igual |
| `confidence` calibration | Diff de means | `mean(confidence \| correct) - mean(confidence \| wrong)` |

**Score agregado** (weighted):

```
score = 0.10 * fuzzy(producto)
      + 0.10 * exact(categoria)
      + 0.15 * f1(ingredientes)
      + 0.20 * f1(alergenos)       ← safety-critical
      + 0.20 * f1(sellos)          ← safety-critical
      + 0.10 * exact(apto_*)
      + 0.15 * exact(riesgo)       ← computed via rules
```

### 4.2 `detect_label_kind-v*`

Confusion matrix sobre el bucket food + non-food:

| | Predicted: food | Predicted: not-food |
|---|---|---|
| **Actual: food** | TP | FN |
| **Actual: not-food** | FP | TN |

Métricas: Precision = TP/(TP+FP), Recall = TP/(TP+FN), F1.

### 4.3 `explain_product-v*`

Heurísticas (no se llama a otro LLM para no quemar tokens):

| Check | Pass condition |
|-------|---------------|
| Longitud | 80 ≤ chars ≤ 500 |
| Disclaimer presente | contiene "NutriLens es un asistente informativo" |
| Sin frases bloqueadas | no matchea blocklist (`consulta a un médico`, `no consumir`, `tóxico`, etc.) |
| Menciona restricciones | si el producto tiene alérgenos detectados, el texto los menciona |
| Tone informativo | no tiene "!" final ni mayúsculas sostenidas |

### 4.4 `chat_parse_intent-v*`

Sobre `evals/chat/intents.json` (15 preguntas anotadas con su intent esperado):

| Field del intent | Métrica |
|-------|---------|
| `kind` | Exact match |
| `categoria` | Exact match (con null como valor válido) |
| `apto` | Exact match |
| `alergeno_excluido` | Exact match |
| `keywords` | F1 sobre sets |

### 4.5 `chat_answer-v*`

| Check | Pass condition |
|-------|---------------|
| Faithfulness | La respuesta menciona solo productos del contexto (regex check sobre nombres) |
| Disclaimer presente | contiene "Basado en productos analizados por vos" |
| Sin productos inventados | ningún nombre fuera del contexto pasa al output |
| Longitud razonable | 50 ≤ chars ≤ 800 |

---

## 5. Thresholds

| Métrica | MVP | Demo | Producción |
|---------|-----|------|-----------|
| `extract.producto` fuzzy | ≥0.70 | ≥0.85 | ≥0.90 |
| `extract.categoria` exact | ≥0.80 | ≥0.90 | ≥0.95 |
| `extract.ingredientes` F1 | ≥0.65 | ≥0.80 | ≥0.85 |
| `extract.alergenos` F1 | ≥0.80 | ≥0.90 | ≥0.95 |
| `extract.sellos` F1 | ≥0.85 | ≥0.95 | ≥0.95 |
| `extract.aptitudes` exact | ≥0.75 | ≥0.90 | ≥0.95 |
| `extract.riesgo` exact | ≥0.85 | ≥0.95 | ≥0.97 |
| `extract.confidence_calibration` diff | ≥0.15 | ≥0.20 | ≥0.20 |
| `extract.aggregate_score` | ≥0.75 | ≥0.88 | ≥0.93 |
| `detect_label_kind` F1 | ≥0.85 | ≥0.95 | ≥0.97 |
| `explain` pass rate | ≥0.85 | ≥0.95 | ≥0.98 |
| `chat_parse_intent.kind` exact | ≥0.85 | ≥0.95 | ≥0.97 |
| `chat_answer` faithfulness | ≥0.95 | ≥0.98 | ≥0.99 |

> **Política:** safety-críticos (`alergenos`, `sellos`, `riesgo`, `chat_answer.faithfulness`) deben cumplir **threshold demo** incluso para el MVP. Es preferible una demo con menos productos bien analizados que una con muchos errores en alérgenos.

---

## 6. Refinement loop

```
┌───────────────────────────────────────────────────────────┐
│ 1. Run eval                                               │
│    IA_PROVIDER=foundry npm run eval -- --prompt foo-v1   │
└────────────────┬──────────────────────────────────────────┘
                 ▼
┌───────────────────────────────────────────────────────────┐
│ 2. Check thresholds                                       │
└────────┬────────────────────────────┬─────────────────────┘
       pass                          fail
         │                             │
         │                             ▼
         │            ┌──────────────────────────────────┐
         │            │ 3. Analyze errors                │
         │            │    - Group by category/tag       │
         │            │    - Find patterns               │
         │            └──────────────┬───────────────────┘
         │                           ▼
         │            ┌──────────────────────────────────┐
         │            │ 4. Choose intervention           │
         │            │   a) Adjust prompt text          │
         │            │   b) Add few-shot examples       │
         │            │   c) Image pre-processing        │
         │            │   d) Activate Doc Intelligence   │
         │            │   e) Switch model (last resort)  │
         │            └──────────────┬───────────────────┘
         │                           ▼
         │            ┌──────────────────────────────────┐
         │            │ 5. Bump prompt version           │
         │            │    foo-v1 → foo-v2               │
         │            │    Re-run eval                   │
         │            └──────────────┬───────────────────┘
         │                           │
         │                           ▼
         │            ┌──────────────────────────────────┐
         │            │ 6. Compare v1 vs v2              │
         │            │    No regression on any metric?  │
         │            └──────────────┬───────────────────┘
         │                           │
         ▼                           ▼
┌───────────────────────────────────────────────────────────┐
│ 7. Commit report to evals/results/                        │
│    Use commit message: "eval(extract): v2 baseline"       │
└───────────────────────────────────────────────────────────┘
```

**Regla de oro:** **no se cambia un prompt sin re-correr eval**. Es la única forma de detectar regresiones invisibles.

---

## 7. Cuándo se corre

| Trigger | Quien | Frecuencia |
|---------|-------|-----------|
| Cambio de prompt | dev local | siempre (antes de PR) |
| Cambio de provider o modelo | dev local | siempre |
| Cambio en reglas (E03) | dev local | siempre (afecta `riesgo`) |
| Pre-merge a `main` de PRs que tocan IA | dev local | manualmente |
| (Opcional) Nightly schedule | GitHub Action | una vez por noche, commitea reporte |

**No corre en CI por PR** — el costo en tokens lo hace prohibitivo para feature branches.

---

## 8. Costo estimado de una eval completa

Sobre ~25 imágenes + 10 non-food + 10 preguntas chat:

| Eval | Llamadas | Tokens aprox | Costo aprox (USD) |
|------|---------|-------------|-------------------|
| `extract_product` | 25 | ~50k in + 12k out | ~$0.05 |
| `detect_label_kind` | 35 (incluye non-food) | ~20k in + 1k out | ~$0.02 |
| `explain_product` | 10 | ~5k in + 2k out | ~$0.001 |
| `chat_parse_intent` | 15 | ~5k in + 1k out | ~$0.001 |
| `chat_answer` | 10 | ~20k in + 4k out | ~$0.004 |
| **Total por corrida full** | ~95 | | **~$0.08** |

Con caché de respuestas en `evals/.cache/`, una segunda corrida (sin cambio de prompt) es $0.

---

## 9. Tests adicionales que no requieren eval

Hay cosas que se pueden verificar con tests unit/integration sin gastar tokens:

- Estructura del JSON (Zod schema) → ya está en `tests/unit/product-schema.test.ts`.
- Reglas de aptitud y cálculo de riesgo (puro JS) → será US-16/17.
- Sanitización del output de explain (regex blocklist) → será US-18.
- Validación de archivo (validate_file) → será US-03/US-08.
- Cache hit por hash → será US-22.

El eval es complementario: valida **calidad del output del LLM**, no la lógica del código.

---

## 10. Reportes — formato

Cada reporte vive en `evals/results/<prompt>-<version>-<timestamp>.md` y se commitea.

```markdown
# Eval Report — extract_product-v1 — 2026-05-16 14:32

## Config
- Provider: foundry
- Model: Phi-4-multimodal-instruct
- Prompt version: extract_product-v1
- Dataset: 25 cases (15 own + 10 OFF), 0 errors loading

## Summary
- Cases evaluated: 25
- Pass thresholds: ✓ MVP (8/8), ✗ Demo (5/8)
- Total tokens: 50,420 in / 12,210 out
- Total cost: $0.052
- p95 latency: 4.8s

## Aggregate score
- 0.79 (weighted, see spec §4.1)
- Thresholds: MVP 0.75 ✓ | Demo 0.88 ✗

## Métricas por campo
| Field | Metric | Value | MVP | Demo | Status |
|-------|--------|-------|-----|------|--------|
| producto | fuzzy | 0.86 | 0.70 | 0.85 | ✓ |
| categoria | exact | 0.92 | 0.80 | 0.90 | ✓ |
| ingredientes | F1 | 0.71 | 0.65 | 0.80 | ⚠ MVP |
| alergenos | F1 | 0.84 | 0.80 | 0.90 | ✓ MVP, ✗ Demo |
| sellos | F1 | 0.92 | 0.85 | 0.95 | ✓ MVP, ✗ Demo |
| aptitudes | exact | 0.84 | 0.75 | 0.90 | ✓ MVP, ✗ Demo |
| riesgo | exact | 0.96 | 0.85 | 0.95 | ✓ |
| confidence diff | diff | 0.22 | 0.15 | 0.20 | ✓ |

## Top failing cases
1. [005 galletitas-sin-tacc] alergenos: missed "soja"
2. [007 yogur-griego] categoria: predicted "bebidas", expected "lácteos"
3. [012 cereal-kelloggs] sellos: missed "exceso en azúcares"
4. ...

## Diffs vs baseline (extract_product-v0)
- alergenos F1: +0.05 (mejor)
- sellos F1: +0.08 (mejor)
- producto fuzzy: -0.02 (regresión leve, aceptable)

## Recommendations
- Mejorar detección de soja en lista de ingredientes (varios casos lo confunden con otros).
- Considerar few-shot example con etiqueta de yogur para fix de categoria.
```

---

## 11. Open Food Facts — cómo seleccionamos las 10 imágenes

1. Filtrar productos argentinos (parámetro `countries=Argentina` en la API).
2. Buscar productos con `image_front_url` no nulo y `ingredients_text` no vacío.
3. Elegir 10 que cubran las categorías y aptitudes que nuestro dataset propio no cubre bien.
4. Descargar imagen + meter en `manifest.json` con `source: "openfoodfacts"` y `off_url`.
5. Verificar a mano que los datos esperados que armamos coincidan con lo que se ve en la imagen (a veces OFF tiene datos de versiones distintas del producto).

Script auxiliar `evals/scripts/fetch-off.ts` (a implementar) toma una lista de barcodes y baja imagen + metadata.

---

## 12. Métricas de éxito de E07

- Eval runner corre sin errores en local y opcionalmente en nightly.
- Reporte se genera en markdown y se commitea.
- Dataset completo (25 casos + 10 non-food + 15 chat) en el repo.
- Al menos 2 iteraciones documentadas para `extract_product` antes de la demo.
- En la demo, todos los safety-críticos pasan threshold demo.

---

## 13. Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| El dataset es muy chico (25 casos) | Compensamos con cobertura cuidada por categoría/tag |
| Sesgo del dataset hacia productos comunes | Documentar limitaciones en el reporte; pedir al evaluador del TP que pruebe con productos fuera del dataset |
| Caché desincronizada (cambió el prompt pero el caché no se invalidó) | Caché key incluye sha del prompt; `--no-cache` flag para forzar |
| OFF tiene datos desactualizados | `notes` en cada caso indica si los datos esperados se verificaron manualmente |
| Threshold inalcanzable con Phi-4 | Plan B documentado: subir Document Intelligence para PDFs, o esperar acceso a GPT-4o |
