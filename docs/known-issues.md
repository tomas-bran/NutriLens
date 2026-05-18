# Known issues & follow-ups

Bugs conocidos y decisiones que dejamos pendientes para no bloquear el flujo de stories. Cada entry incluye **síntoma**, **impacto**, **workaround**, y **fix propuesto**. Cuando se resuelva, mover la entrada a "Cerrados" al final del doc (con el SHA del commit / PR que lo cierra).

---

## Activos

### KI-02 — `Phi-4-mini-instruct` no responde en Azure AI Foundry MaaS (cuenta Students)

**Descubierto:** 2026-05-18 verificando KI-01 end-to-end.
**Severidad:** alta para la demo final · ninguna para dev/CI (usan mock).
**Componentes afectados:** Azure (no es código nuestro).

#### Síntoma

Llamada directa al endpoint del modelo timeoutea sin respuesta:

```bash
time curl -sS -X POST "${AZURE_AI_FOUNDRY_ENDPOINT}/chat/completions" \
  -H "Authorization: Bearer ${AZURE_AI_FOUNDRY_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"model":"Phi-4-mini-instruct","messages":[{"role":"user","content":"hi"}],"max_tokens":5}' \
  --max-time 30
# → curl: (28) Operation timed out after 30000 milliseconds with 0 bytes received
```

Nuestro código (`FoundryProvider`) lo refleja como `model_timeout` 504 tras ~26s (8s parse + 2s backoff + 8s retry + overhead).

#### Diagnóstico (verificado)

- `GET ${ENDPOINT}/models` con la misma key responde 200 OK en 2.5s → la **cuenta y la key funcionan**.
- El modelo `Phi-4-mini-instruct` aparece en el catálogo (junto con `Phi-3.5-mini-instruct`, `Phi-4`, etc.).
- Solo la inference call a Phi-4-mini cuelga. No es un problema del cliente ni de nuestro código.

#### Causas probables (por descartar en orden)

1. **Crédito Azure for Students agotado**: revisar saldo en el [Azure portal](https://portal.azure.com/#blade/Microsoft_Azure_Billing/SubscriptionsBladeV2). Si está en cero, el deployment se pausa pero sigue listado.
2. **Deployment MaaS no provisionado**: revisar en Foundry hub → Deployments. Phi-4-mini puede aparecer en el catálogo sin estar "deployed" en la suscripción.
3. **Rate-limit / cuota MaaS alcanzada**: si Microsoft puso quota baja para Students en ese modelo, las primeras calls funcionan y después cuelga.
4. **Outage de Foundry MaaS** en el region: ver [Azure status](https://status.azure.com).

#### Workaround (mientras se resuelve KI-02)

Bajar a `Phi-3.5-mini-instruct` (texto) y `Phi-3.5-vision-instruct` (multimodal) editando `.env.local`:

```bash
AZURE_AI_FOUNDRY_MODEL_MULTIMODAL=Phi-3.5-vision-instruct
AZURE_AI_FOUNDRY_MODEL_MINI=Phi-3.5-mini-instruct
```

Calidad ligeramente menor pero responden. El resto del código no cambia: el provider despacha por el campo `model` en el body.

#### Cómo reproducir

Ver bloque "Síntoma".

#### Acciones pendientes (Federico)

- [ ] Revisar saldo y status del deployment en Azure portal.
- [ ] Si el crédito está OK pero el deployment no responde, intentar redeploy del modelo.
- [ ] Si no se resuelve antes de la demo, bajar a Phi-3.5 con el workaround.

---

## Cerrados

### KI-01 — `loadPrompt` rompe en runtime cuando `IA_PROVIDER=foundry`

**Cerrado:** 2026-05-18 · PR #26 (commit a definir al mergear) en `fix/KI-01-prompt-loader`.

**Síntoma original:** `ENOENT: no such file or directory, open '.next/server/app/api/<route>/<prompt>.md'` cuando un route invocaba `loadPrompt`. Afectaba `/api/analyze` y `/api/chat` con `IA_PROVIDER=foundry`.

**Causa raíz:** `loadPrompt` hacía `readFileSync(join(__dirname, file))`. Webpack reescribe `__dirname` al directorio del bundle compilado, y los `.md` no se copian ahí (ni en `next dev`, ni con `output: 'standalone'`).

**Fix aplicado:** se inlinearon los `.md` en el bundle vía **`?raw` import** (Vite-style):

- `next.config.mjs`: regla webpack `resourceQuery: /raw/` → `type: 'asset/source'` (también soportado nativamente por Vite/Vitest, sin config extra).
- `src/types/raw-imports.d.ts`: declaración de módulo `*?raw` para TypeScript.
- `src/lib/ai/prompts/index.ts`: reescrito con `import EXTRACT_PRODUCT_V1 from './extract_product-v1.md?raw'` × N. Cero `readFileSync`, cero `__dirname`, cero file tracing.

**Verificación:** con el dev arriba en `IA_PROVIDER=foundry` y la DB seedeada, `POST /api/chat` ya no devuelve `internal_error` por ENOENT. El bug que destapó KI-01 al usar el modelo real (Phi-4-mini-instruct no responde) es ahora **KI-02**, separado.

**Otras opciones consideradas y descartadas:**

- `outputFileTracingIncludes`: solo arregla prod, no `next dev`.
- `readFileSync(resolve(process.cwd(), …))`: funciona en dev/local pero rompe en serverless / Docker que no preservan `src/`.
- Inline como `.ts` con template literals: pierde legibilidad de los `.md` en PRs.

El approach `?raw` cubre todos los entornos (dev / build / standalone / Vitest) con una sola configuración.
