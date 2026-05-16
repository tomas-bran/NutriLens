# E07 — Quality assurance y evaluación de modelos

> User stories del épico E07. Cubre el aseguramiento de calidad del output del LLM mediante un dataset propio + Open Food Facts.

**Spec técnico:** [`../../specs/E07-evaluation-strategy.md`](../../specs/E07-evaluation-strategy.md).

---

## US-40 — Eval dataset + runner básico

**Story Points:** 8
**Prioridad MVP:** P1
**Épica:** E07

### Descripción

**Como** equipo,
**quiero** un dataset de etiquetas con sus respuestas esperadas y un script que mida la calidad del modelo,
**para** saber si la IA está rindiendo lo suficientemente bien antes de la demo.

### Criterios de aceptación

**Escenario 1: Dataset cargado en el repo**

- **Dado** que somos un dev que clona el repo por primera vez
- **Cuando** abrimos `/evals/dataset/manifest.json`
- **Entonces** vemos al menos 25 casos (15 propios + 10 de Open Food Facts) con sus campos `id`, `file`, `mime`, `source`, `license`, `expected`, `tags` completos
- **Y** cada archivo referenciado existe físicamente en `/evals/dataset/images/` o `/evals/dataset/pdfs/`
- **Y** la cobertura cumple la matriz del spec §2.2 (al menos 2 casos por categoría, al menos 1 caso con cada alérgeno, etc.)

**Escenario 2: Eval runner ejecutable**

- **Dado** que tengo `IA_PROVIDER=foundry` y las keys de Azure configuradas
- **Cuando** corro `npm run eval -- --prompt extract_product-v1`
- **Entonces** el script ejecuta el pipeline contra cada caso del dataset
- **Y** genera un reporte en `/evals/results/extract_product-v1-<timestamp>.md`
- **Y** el reporte tiene métricas por campo (producto, categoria, ingredientes_detectados, alergenos, sellos, aptitudes, riesgo) y el aggregate score

**Escenario 3: Filtros y caching**

- **Dado** que ya corrí el eval una vez
- **Cuando** corro de nuevo con `--cache-only`
- **Entonces** no se llama al modelo y se reutilizan respuestas cacheadas
- **Y** los costos en tokens son 0
- **Y** el reporte se regenera con las mismas respuestas

**Escenario 4: Cache invalidation por cambio de prompt**

- **Dado** que cambié el contenido del prompt `extract_product-v1.md`
- **Cuando** corro el eval
- **Entonces** el caché detecta el cambio (sha del prompt difiere) y re-ejecuta

**Escenario 5: Thresholds enforcement**

- **Dado** que el reporte tiene métricas calculadas
- **Cuando** alguna métrica baja del threshold MVP del spec §5
- **Entonces** el script termina con exit code 1
- **Y** el reporte resalta cuáles métricas no pasaron

**Escenario 6: Non-food bucket para detect_label_kind**

- **Dado** que existe `/evals/dataset/non-food/` con al menos 10 imágenes
- **Cuando** corro `npm run eval -- --prompt detect_label_kind-v1`
- **Entonces** el reporte incluye confusion matrix (TP, FP, TN, FN) y F1
- **Y** evalúa tanto los casos food (del dataset principal) como los non-food

---

## US-41 — Refinamiento iterativo del prompt `extract_product`

**Story Points:** 5
**Prioridad MVP:** P1
**Épica:** E07

### Descripción

**Como** equipo de IA,
**quiero** iterar la versión del prompt `extract_product` hasta cumplir los thresholds de demo,
**para** garantizar la calidad de la extracción antes de mostrar la app a evaluadores.

### Criterios de aceptación

**Escenario 1: Baseline documentado**

- **Dado** que existe `extract_product-v1`
- **Cuando** corro el eval por primera vez
- **Entonces** los resultados se commitean como baseline en `/evals/results/extract_product-v1-<timestamp>.md`
- **Y** el reporte indica claramente qué thresholds pasaron y cuáles no

**Escenario 2: Iteración a v2 con mejora medible**

- **Dado** que `extract_product-v1` no pasa algún threshold demo
- **Cuando** se crea `extract_product-v2` con ajustes basados en los errores observados (ej. few-shot examples, instrucciones más explícitas)
- **Entonces** al correr `npm run eval -- --compare extract_product-v1 extract_product-v2`
- **Y** el reporte muestra que las métricas que estaban abajo del threshold mejoran
- **Y** NO hay regresiones mayores a 0.05 en otras métricas

**Escenario 3: Safety-critical thresholds**

- **Dado** que estamos cerca de la demo
- **Cuando** corro el eval final
- **Entonces** las métricas `alergenos`, `sellos`, `riesgo` y `chat_answer.faithfulness` cumplen threshold **demo** (no solo MVP)
- **Y** documento en `/evals/results/SUMMARY.md` qué casos del dataset todavía fallan y por qué

**Escenario 4: Decisión de plan B**

- **Dado** que tras 3 iteraciones el modelo no llega a los thresholds demo
- **Cuando** evaluamos opciones
- **Entonces** documentamos un ADR (`docs/decisions/ADR-00X-fallback-plan.md`) con la decisión (activar Document Intelligence para PDFs, esperar acceso a GPT-4o, o ajustar scope)

---

## US-42 — Eval del chat RAG

**Story Points:** 3
**Prioridad MVP:** P2
**Épica:** E07

### Descripción

**Como** equipo,
**quiero** evaluar la calidad del chat RAG (`chat_parse_intent` y `chat_answer`),
**para** asegurar que el chat responde con productos reales del historial y no inventa.

### Criterios de aceptación

**Escenario 1: Intents anotados**

- **Dado** que existe `/evals/chat/intents.json` con al menos 15 preguntas etiquetadas con su intent esperado (`kind`, `categoria`, `apto`, `keywords`, etc.)
- **Cuando** corro `npm run eval -- --prompt chat_parse_intent-v1`
- **Entonces** el reporte muestra exact match por cada campo del intent
- **Y** el campo `kind` cumple threshold MVP (≥0.85)

**Escenario 2: Faithfulness del chat_answer**

- **Dado** un set de 10 preguntas con contexto controlado (productos predefinidos)
- **Cuando** corro `npm run eval -- --prompt chat_answer-v1`
- **Entonces** el reporte verifica que NINGUNA respuesta menciona productos que NO están en el contexto
- **Y** TODAS las respuestas incluyen el disclaimer "Basado en productos analizados por vos"
- **Y** la longitud de cada respuesta está entre 50 y 800 chars

**Escenario 3: Empty context handling**

- **Dado** que el contexto de productos es vacío
- **Cuando** el eval evalúa el caso "preguntar sin productos guardados"
- **Entonces** la respuesta es el mensaje predefinido del spec E05 §7 (no llama al LLM)
- **Y** no hay tokens consumidos en ese caso
