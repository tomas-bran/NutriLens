# Spec E01 — Onboarding & Upload de etiquetas

> Spec de la épica E01. Define el contrato del flujo de upload, las validaciones de archivo, los estados del cliente, los errores estructurados y el endpoint que recibe el archivo.

**User stories cubiertas:** US-01, US-02, US-03, US-04, US-05, US-06, US-07.
**Depende de:** [`00-overview.md`](./00-overview.md).
**Wireframes:** `docs/wireframes/desktop/D01-Home-Upload.png`, `docs/wireframes/mobile/M02-Home-Upload.png`, `docs/wireframes/mobile/M03-Upload-Sheet.png`, `docs/wireframes/mobile/M07-Error.png`.

---

## 1. Goals & Non-goals

**Goals**

- Permitir al usuario subir una imagen (JPG/PNG) o un PDF de una etiqueta alimentaria.
- Validar el archivo antes de gastar tokens del modelo (tipo MIME, tamaño, hash).
- Detectar si el contenido es plausiblemente una etiqueta alimentaria con una call barata (validación rápida) **antes** de la extracción completa.
- Exponer estados claros al usuario en todo el flujo (cargado → procesando → completado / error).
- Devolver errores estructurados consistentes para que la UI sepa qué decirle al usuario y qué acción ofrecer.

**Non-goals (para este épico)**

- No incluye la extracción del JSON (eso vive en **E02**).
- No incluye persistencia en la DB (vive en **E04**).
- No incluye captura de cámara con OCR en tiempo real — es post-MVP.
- No incluye autenticación de usuarios.

---

## 2. Flujo end-to-end del upload

```
[UI Home / Upload]
    ↓ (usuario selecciona archivo)
[Validación cliente] ── MIME / size / extensión
    ↓ ok
[POST /api/analyze multipart] ─────────────► [Backend]
                                              ↓
                                          validate_file
                                              ↓
                                       detect_label_kind (call IA barata)
                                              ↓ ok
                                       (continúa pipeline E02…)
                                              ↓
                                          200 OK con resultado
    ↓
[UI muestra "Análisis completado"]
```

Si en cualquier paso hay un error → respuesta `4xx`/`5xx` con shape estructurado (ver §5).

---

## 3. Validaciones del cliente

Antes de hacer la request al backend, la UI valida y rechaza si:

| Regla | Detalle | Mensaje al usuario |
|------|---------|-------------------|
| MIME permitido | `image/jpeg`, `image/png`, `application/pdf` | "Formato no soportado. Subí una imagen (JPG/PNG) o un PDF." |
| Extensión coincide con MIME | extra robustez (`.jpg`, `.jpeg`, `.png`, `.pdf`) | mismo mensaje |
| Tamaño máximo | `≤ 10 MB` (10 \* 1024 \* 1024 bytes) | "El archivo supera el tamaño máximo de 10 MB." |
| Archivo no vacío | `> 0 bytes` | "El archivo está vacío." |

El cliente calcula el hash SHA-256 del archivo y lo manda como header `X-File-Hash` para que el backend pueda cachear (ver §6.2).

---

## 4. Endpoint `POST /api/analyze`

Es el único endpoint expuesto en esta épica. Recibe el archivo, valida, dispara el pipeline (E02–E03) y persiste (E04). Acá especificamos **solo** la entrada y la validación inicial; los pasos posteriores se especifican en sus respectivas épicas.

### 4.1 Request

```
POST /api/analyze
Content-Type: multipart/form-data; boundary=...
X-Request-Id: <uuid v4>            (opcional; si no se manda, el server genera uno)
X-File-Hash:  <sha256 hex>         (opcional pero recomendado)

Form fields:
  file: <binary>                   (required)
  source: "upload" | "demo"        (optional; default "upload")
```

### 4.2 Response — éxito

```
200 OK
Content-Type: application/json
X-Request-Id: <mismo o generado>

{
  "id": "9d2b...-uuid",
  "product": { ... ProductExtraction ... },
  "savedAt": "2026-05-16T14:32:11.000Z",
  "pipelineTrace": [ ... StepTrace[] ... ]
}
```

(El shape exacto de `product` y `pipelineTrace` vive en `00-overview.md` §6 y E02/E06).

### 4.3 Response — error

Shape común (ver `00-overview.md` §4.1):

```json
{
  "error": "<código>",
  "reason": "<mensaje legible en español>",
  "details": { ... }
}
```

| Código | HTTP | Cuándo |
|--------|------|--------|
| `unsupported_file_type` | 400 | MIME no permitido o sin `file` |
| `file_too_large` | 400 | `Content-Length` > 10 MB o el stream supera el límite |
| `empty_file` | 400 | archivo de 0 bytes |
| `pdf_unreadable` | 400 | PDF dañado / cifrado / sin texto ni imagen interpretable |
| `image_not_supported` | 422 | el modelo dictamina que no es etiqueta alimentaria |
| `model_timeout` | 504 | la validación de la IA superó el timeout |
| `model_rate_limited` | 429 | el proveedor devolvió 429 |
| `model_error` | 502 | otro error del proveedor |
| `internal_error` | 500 | catch-all |

---

## 5. Step `validate_file` (backend)

Es el primer step del pipeline. **No** llama a la IA — solo chequea el archivo. Si falla, devolvemos error sin gastar tokens.

```ts
// lib/pipeline/steps/validate_file.ts
export async function validate_file(ctx: AnalysisContext): Promise<AnalysisContext> {
  const { file } = ctx;
  if (file.sizeBytes <= 0) throw new ApiError('empty_file', 'El archivo está vacío.', 400);
  if (file.sizeBytes > 10 * 1024 * 1024)
    throw new ApiError('file_too_large', 'El archivo supera 10 MB.', 400);

  const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowed.includes(file.mime))
    throw new ApiError('unsupported_file_type',
      'Formato no soportado. Subí una imagen (JPG/PNG) o un PDF.', 400);

  if (file.mime === 'application/pdf') {
    const ok = await canReadPdf(file.buffer);
    if (!ok) throw new ApiError('pdf_unreadable',
      'No pudimos leer el PDF. Intentá con otro archivo.', 400);
  }
  return ctx;
}
```

`canReadPdf` usa `pdf-parse` para verificar que el PDF abra y tenga al menos una página decodificable. **No** extrae texto todavía — eso lo hace `Phi-4-multimodal` en E02 (o Document Intelligence si lo activamos).

---

## 6. Step `detect_label_kind` (backend)

Es la primera (y única en esta épica) llamada al modelo. Sirve de **filtro barato** antes de la extracción completa de E02. Usa **Phi-4-multimodal-instruct** (mismo deployment que usaremos para extracción). Cuando se apruebe Azure OpenAI, migrará a `gpt-4o-mini` sin cambios de prompt.

### 6.1 Prompt (versión inicial `detect_label_kind-v1.md`)

```
Eres un clasificador. Mirá la imagen y respondé únicamente con JSON:

{ "is_food_label": true | false, "confidence": 0.00 }

Reglas:
- "is_food_label" es true si la imagen muestra una etiqueta de un producto
  alimentario (lista de ingredientes, tabla nutricional, frente del producto,
  sellos de advertencia). Es false si muestra paisajes, personas, objetos
  no alimentarios, o capturas de pantalla genéricas.
- "confidence" es tu score [0, 1].
- No devuelvas texto adicional, solo el JSON.
```

### 6.2 Implementación

```ts
export async function detect_label_kind(ctx: AnalysisContext, ia: IaProvider) {
  // Cache por hash de archivo: si ya analizamos este file, saltamos.
  const cached = await cache.get(`label_kind:${ctx.file.hash}`);
  if (cached) return { ...ctx, labelKind: cached };

  const { raw } = await ia.classifyLabelKind(ctx.file.buffer, ctx.file.mime, {
    promptVersion: 'detect_label_kind-v1',
  });
  const parsed = LabelKindSchema.parse(JSON.parse(raw));
  await cache.set(`label_kind:${ctx.file.hash}`, parsed, { ttlSeconds: 3600 });

  if (!parsed.is_food_label && parsed.confidence >= 0.6) {
    throw new ApiError('image_not_supported',
      'La imagen no parece corresponder a una etiqueta alimentaria.', 422,
      { confidence: parsed.confidence });
  }
  // Si confidence < 0.6 dejamos pasar y avisamos en UI con badge "Confianza baja"
  // (la advertencia final la maneja E03).
  return { ...ctx, labelKind: parsed };
}
```

### 6.3 Schema de la respuesta

```ts
export const LabelKindSchema = z.object({
  is_food_label: z.boolean(),
  confidence: z.number().min(0).max(1),
});
```

### 6.4 Costo estimado

Una imagen de 1024×1024 con **Phi-4-multimodal** para clasificación pesa ~600 tokens in + 20 out → **~$0.0007** por archivo. Con cache por hash, los re-uploads no cuestan nada. (Si migramos a `gpt-4o-mini` baja a ~$0.0001.)

---

## 7. Modelo de estados en la UI

Máquina de estados del componente `<UploadFlow>`:

```
       ┌─────────┐ select        ┌──────────┐
start →│  IDLE   │──────────────→│ SELECTED │
       └─────────┘               └────┬─────┘
                                      │ submit
                                      ▼
                                ┌──────────────┐  error  ┌─────────┐
                                │  UPLOADING   │────────→│  ERROR  │
                                └──────┬───────┘         └────┬────┘
                                       │ 200 OK              │ retry
                                       ▼                     │
                                ┌──────────────┐             │
                                │  PROCESSING  │             │
                                └──────┬───────┘             │
                                       │ result              │
                                       ▼                     │
                                ┌──────────────┐             │
                                │  COMPLETED   │             │
                                └──────────────┘             │
                                       ▲                     │
                                       └─────────────────────┘
```

Estados visuales (de los wireframes):

| Estado | UI |
|--------|----|
| `IDLE` | Dropzone con CTA "Subir foto o PDF". Botón "Analizar" deshabilitado. |
| `SELECTED` | Preview de la imagen / nombre del PDF + botón "Analizar producto". |
| `UPLOADING` | Barra de progreso del upload (XHR progress). Texto "Subiendo archivo…". |
| `PROCESSING` | Spinner + texto "Procesando imagen…". El backend ya tiene el archivo. |
| `COMPLETED` | Redirige a `/analizar/[id]` con el resultado. |
| `ERROR` | `<ErrorState>` con icono + título según `error` + descripción = `reason` + botón "Probar con otro archivo" (vuelve a `IDLE`). |

---

## 8. Pantalla de inicio (US-07)

`/` (Home) muestra:

- Hero con título, subtítulo y CTA principal "Analizar producto".
- Bloque "Cómo funciona" con 3 pasos: 1) Subí una foto, 2) Esperá unos segundos, 3) Mirá el análisis.
- Bloque "Ejemplos válidos" con 3 thumbnails (frente, ingredientes, tabla nutricional).
- Si hay productos en historial: card "Tu historial" con CTA "Ver historial".
- Footer con disclaimer corto ("NutriLens es un asistente informativo…", ver E03).

El layout es responsive (ver E06): en mobile el bloque "Ejemplos" pasa a carrusel horizontal.

---

## 9. Errores: mapeo `error code` → UI

| `error` | Título UI | Descripción UI | Acción primaria |
|--------|-----------|---------------|------------------|
| `unsupported_file_type` | "Formato no soportado" | usa `reason` | "Probar con otro archivo" |
| `file_too_large` | "Archivo muy grande" | "El archivo supera el límite de 10 MB. Subí una imagen más liviana." | "Probar con otro archivo" |
| `empty_file` | "Archivo vacío" | "No pudimos leer el archivo. Probá con otro." | "Probar con otro archivo" |
| `pdf_unreadable` | "PDF ilegible" | "No pudimos abrir el PDF. Probá con una foto." | "Probar con otro archivo" |
| `image_not_supported` | "No parece una etiqueta" | usa `reason` + sugerencia "Subí una foto del frente, ingredientes o tabla nutricional." | "Probar con otro archivo" |
| `model_timeout` | "Tardamos demasiado" | "El análisis se demoró más de lo esperado." | "Reintentar" (mismo archivo) |
| `model_rate_limited` | "Demasiadas solicitudes" | "Esperá unos segundos y volvé a intentar." | "Reintentar" |
| `model_error` / `internal_error` | "Algo salió mal" | "Tuvimos un problema procesando tu archivo." | "Reintentar" + "Probar con otro archivo" |

Todos los errores loguean en la UI el `X-Request-Id` para que el evaluador del TP pueda correlacionar con los logs del backend.

---

## 10. Logging

Eventos a emitir desde esta épica:

| Evento | Cuándo | Campos clave |
|--------|--------|-------------|
| `upload.received` | El backend recibió el multipart | `requestId`, `mime`, `sizeBytes`, `fileHash` |
| `upload.rejected_by_validation` | Falló `validate_file` | `requestId`, `error`, `details` |
| `label_kind.checked` | Terminó `detect_label_kind` | `requestId`, `is_food_label`, `confidence`, `latencyMs`, `cached` |
| `upload.rejected_by_classification` | `is_food_label=false` con confidence ≥ 0.6 | `requestId`, `confidence` |

Sin contenido del archivo en logs. Solo metadata.

---

## 11. Tests

**Unit**

- `validate_file`: cubre cada error code (`unsupported_file_type`, `file_too_large`, `empty_file`, `pdf_unreadable`) con fixtures.
- `LabelKindSchema` valida ejemplos buenos/malos.

**Integration**

- `POST /api/analyze` con `MockIaProvider` retornando `{ is_food_label: false, confidence: 0.9 }` → 422 con `image_not_supported`.
- `POST /api/analyze` con archivo `.docx` → 400 `unsupported_file_type`.
- `POST /api/analyze` con archivo de 11 MB → 400 `file_too_large`.
- `POST /api/analyze` con PDF dañado (fixture) → 400 `pdf_unreadable`.

**E2E (Playwright)**

- Flujo feliz: drop de imagen JPG válida → ver pantalla "Procesando" → llegar a resultado mockeado.
- Flujo error: drop de PDF dañado → ver `<ErrorState>` con título "PDF ilegible" y botón funcional.

---

## 12. Decisiones técnicas y trade-offs

| Decisión | Alternativa descartada | Por qué |
|---------|----------------------|--------|
| Validar tamaño en cliente Y en backend | solo en backend | feedback inmediato al usuario; ahorra ancho de banda |
| Hash del archivo en cliente | hash en backend | permite cache hit antes incluso de subirlo (futuro endpoint `HEAD /api/analyze?hash=…`) |
| `detect_label_kind` con call corta a `Phi-4-multimodal` antes de la extracción completa | hacer todo en una sola call larga | filtro barato; ahorra tokens en archivos no-alimentarios |
| Threshold `confidence ≥ 0.6` para rechazo | rechazar siempre que `is_food_label=false` | tolera falsos negativos del filtro; deja pasar al usuario con baja confianza para que decida |
| Cache por hash | sin cache | obligatorio para no quemar el crédito en re-uploads o tests manuales |
| `multipart/form-data` | `base64` en JSON | streaming nativo, menos overhead, soportado por todos los browsers |

---

## 13. Casos borde

- **Archivo subido por drag&drop vs. input file**: ambos pasan por el mismo `<UploadFlow>`; sin diferencias de comportamiento.
- **Mobile — cámara en vivo**: en `<input type="file" accept="image/*" capture="environment">` el usuario puede tomar una foto directamente. Se trata igual que cualquier upload (post-process se valida MIME/size).
- **Imagen rotada**: no la rotamos; GPT-4o tolera orientaciones; si en tests vemos peor confidence se agrega un step de `auto-orient` con `sharp`.
- **PDF con varias páginas**: solo procesamos la **primera página** en MVP (Document Intelligence o `pdf-parse` extrae página 1). Documentado en la UI ("Si tu PDF tiene varias páginas, asegurate que la etiqueta esté en la primera.").
- **Re-upload del mismo archivo**: si `X-File-Hash` matchea un producto ya guardado (E04), el backend devuelve el producto cacheado con `pipelineTrace.cached = true` y no llama a la IA.

---

## 14. Métricas

- `upload.success_rate` = uploads aceptados / uploads recibidos.
- `upload.rejected_by_validation_rate` por tipo de error.
- `label_kind.false_positive_rate` (manual: muestreo de imágenes que pasaron el filtro pero no eran etiquetas).
- `label_kind.cache_hit_rate`.
- p50/p95 de `detect_label_kind.latencyMs`.
