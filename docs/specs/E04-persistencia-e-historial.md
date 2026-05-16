# Spec E04 — Persistencia e historial

> Spec de la épica E04. Define el modelo de datos, los endpoints de productos, los filtros del historial y la estrategia de storage de imágenes.

**User stories cubiertas:** US-21, US-22, US-23, US-24, US-25, US-26.
**Depende de:** [`00-overview.md`](./00-overview.md), [`E02-analisis-multimodal-ia.md`](./E02-analisis-multimodal-ia.md), [`E03-clasificacion-reglas-explicacion.md`](./E03-clasificacion-reglas-explicacion.md).

---

## 1. Goals & Non-goals

**Goals**

- Persistir cada análisis exitoso en una base de datos relacional.
- Exponer un historial paginado, ordenable y filtrable.
- Permitir abrir el detalle completo de cualquier producto guardado.
- Manejar el storage de imágenes consistentemente entre dev (filesystem) y demo (Azure Blob).
- Soportar deduplicación por hash de archivo.

**Non-goals**

- Edición manual de productos guardados (post-MVP).
- Borrado por el usuario (post-MVP — sí soportamos borrado administrativo via Prisma Studio).
- Sharing / multi-usuario / auth → post-MVP.

---

## 2. Modelo de datos (Prisma)

```prisma
// prisma/schema.prisma
datasource db {
  provider = "sqlite"           // local dev
  // provider = "postgresql"    // demo / prod
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Product {
  id              String   @id @default(uuid())
  fileHash        String   @unique                  // sha256 del archivo subido
  nombre          String
  categoria       Categoria
  ingredientes    String   // JSON serializado de string[]
  alergenos       String   // JSON serializado de string[]
  sellos          String   // JSON serializado de string[]
  aptoVegano      Boolean
  aptoCeliaco     Boolean
  aptoSinLactosa  Boolean
  riesgo          Riesgo
  confidence      Float
  reglasAplicadas String   // JSON serializado de string[]
  explanation     String?
  jsonRaw         String   // raw output de la IA, para debugging
  pipelineTrace   String   // JSON serializado de StepTrace[]
  imagenPath      String   // path en /uploads (dev) o blob URL (prod)
  promptVersion   String   // ej. "extract_product-v1"
  createdAt       DateTime @default(now())

  @@index([categoria])
  @@index([riesgo])
  @@index([createdAt])
}

enum Categoria {
  galletitas
  cereales
  snacks
  lacteos
  bebidas
  sin_tacc
  veganos
  otros
}

enum Riesgo {
  bajo
  medio
  alto
}
```

> **Nota SQLite:** los arrays se guardan como `String` con JSON serializado porque SQLite no soporta arrays nativos. Al migrar a Postgres podríamos cambiar a `String[]` real, pero mantener el shape facilita el switch.

### 2.1 Migraciones

- `prisma migrate dev --name init` en local.
- Para demo: `prisma migrate deploy` después de configurar `DATABASE_URL` apuntando a Azure Database for PostgreSQL.

---

## 3. Step `persist`

Último step del pipeline.

```ts
// lib/pipeline/steps/persist.ts
export async function persist(ctx: AnalysisContext): Promise<AnalysisContext> {
  // Si ya existe por hash, devolvemos el guardado en vez de crear duplicado.
  const existing = await db.product.findUnique({ where: { fileHash: ctx.file.hash } });
  if (existing) {
    return {
      ...ctx,
      saved: existing,
      trace: trace(ctx, 'persist', 'skipped', { reason: 'duplicate_hash', id: existing.id }),
    };
  }

  // Guardar imagen en storage (filesystem o blob)
  const imagenPath = await storage.save(ctx.file.buffer, ctx.file.mime, ctx.file.hash);

  const saved = await db.product.create({
    data: {
      fileHash:       ctx.file.hash,
      nombre:         ctx.product!.producto,
      categoria:      mapCategoria(ctx.product!.categoria),
      ingredientes:   JSON.stringify(ctx.product!.ingredientes_detectados),
      alergenos:      JSON.stringify(ctx.product!.alergenos),
      sellos:         JSON.stringify(ctx.product!.sellos),
      aptoVegano:     ctx.rules!.apto_vegano,
      aptoCeliaco:    ctx.rules!.apto_celiaco,
      aptoSinLactosa: ctx.rules!.apto_sin_lactosa,
      riesgo:         ctx.product!.riesgo,
      confidence:     ctx.product!.confidence,
      reglasAplicadas: JSON.stringify(ctx.rules!.reglas_aplicadas),
      explanation:    ctx.explanation ?? null,
      jsonRaw:        ctx.extractionRaw!,
      pipelineTrace:  JSON.stringify(ctx.steps),
      imagenPath,
      promptVersion:  'extract_product-v1',
    },
  });

  return { ...ctx, saved };
}
```

### 3.1 Reglas

- **No** persistimos si el pipeline falló antes (algún `throw ApiError` lo aborta).
- **Deduplicación** por `fileHash` — devolvemos el existente sin re-correr nada (ya lo cubrimos en E01/E02 con cache, esto es la red de seguridad).
- **La imagen se guarda con nombre = fileHash + extensión** para evitar PII y colisiones.

---

## 4. Storage abstracto

```ts
// lib/storage/index.ts
export interface Storage {
  save(buffer: Buffer, mime: string, hash: string): Promise<string>; // devuelve path relativo o URL
  getStream(pathOrUrl: string): Promise<Readable>;
}
```

Implementaciones:

- **`LocalStorage`** (dev): guarda en `./uploads/<hash>.<ext>`. Devuelve `/uploads/<hash>.<ext>`.
- **`AzureBlobStorage`** (demo): guarda en container `nutrilens-uploads` del Storage Account. Devuelve URL firmada con SAS de 24h.

Selección por env var:

```ts
export const storage: Storage = process.env.AZURE_BLOB_CONNECTION_STRING
  ? new AzureBlobStorage(process.env.AZURE_BLOB_CONNECTION_STRING)
  : new LocalStorage();
```

---

## 5. Endpoints

### 5.1 `GET /api/products` — listado

Query params:

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `categoria` | enum | — | Filtra por categoría exacta |
| `riesgo` | enum | — | Filtra por riesgo exacto |
| `alergeno` | string | — | Devuelve productos cuyo `alergenos` contiene el valor |
| `apto` | `vegano`\|`celiaco`\|`sin_lactosa` | — | Devuelve solo productos aptos para esa restricción |
| `q` | string | — | Búsqueda libre por `nombre` (LIKE `%q%`) |
| `page` | int | 1 | Página (1-indexed) |
| `pageSize` | int | 20 | Tamaño de página (max 50) |
| `sort` | `createdAt:desc` (default) \| `nombre:asc` | `createdAt:desc` | Orden |

Response:

```json
{
  "items": [
    {
      "id": "...",
      "nombre": "Galletitas Choco Crunch",
      "categoria": "galletitas",
      "riesgo": "alto",
      "alergenos": ["gluten", "leche"],
      "aptoVegano": false,
      "aptoCeliaco": false,
      "aptoSinLactosa": false,
      "imagenUrl": "/uploads/abc...jpg",
      "createdAt": "2026-05-16T14:32:11.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 37,
  "totalPages": 2
}
```

> Devolvemos **solo los campos necesarios** para el listado — no `jsonRaw`, `pipelineTrace`, `explanation` ni `ingredientes`. Reduce payload.

### 5.2 `GET /api/products/[id]` — detalle

Response `200`:

```json
{
  "id": "...",
  "nombre": "...",
  "categoria": "galletitas",
  "ingredientes": ["harina de trigo", "azúcar", ...],
  "alergenos": ["gluten", "leche"],
  "sellos": ["exceso en azúcares"],
  "aptoVegano": false,
  "aptoCeliaco": false,
  "aptoSinLactosa": false,
  "riesgo": "alto",
  "confidence": 0.94,
  "reglasAplicadas": ["contiene_gluten", "contiene_lacteos"],
  "explanation": "Este producto contiene gluten y leche...",
  "jsonRaw": "{...}",
  "pipelineTrace": [ ... ],
  "imagenUrl": "/uploads/abc...jpg",
  "promptVersion": "extract_product-v1",
  "createdAt": "..."
}
```

Response `404`: `{"error":"not_found","reason":"Producto no encontrado."}`.

### 5.3 Sin POST/PATCH/DELETE públicos en MVP

La creación viene exclusivamente desde `POST /api/analyze`. No exponemos endpoints de mutación directa.

---

## 6. UI del historial

### 6.1 Pantalla `/historial`

Layout (basado en wireframes `D04-Historial.png`, `M08-Historial-Vacio.png`, `M09-Historial-Items.png`):

```
┌──────────────────────────────────────────────────────────┐
│ Historial                              [+ Nuevo análisis]│
├──────────────────────────────────────────────────────────┤
│ [Buscar...]  [Categoría ▼] [Riesgo ▼] [Alérgeno ▼] [Aptitud ▼] [Limpiar] │
├──────────────────────────────────────────────────────────┤
│ ┌──────┐  Galletitas Choco Crunch                        │
│ │ [img]│  galletitas · riesgo ALTO · hace 2 min           │
│ │      │  [gluten] [leche]                               │
│ └──────┘                                              [→]│
│ ...                                                      │
├──────────────────────────────────────────────────────────┤
│ Página 1 de 2     [Anterior] [Siguiente]                 │
└──────────────────────────────────────────────────────────┘
```

### 6.2 Estado vacío

Cuando `total === 0` y no hay filtros aplicados (`/historial` sin query):

```
┌──────────────────────────────────────────────────────────┐
│  🍽️  Todavía no analizaste ningún producto              │
│                                                          │
│  Cuando subas tu primera etiqueta, va a aparecer acá.   │
│                                                          │
│              [Analizar mi primer producto]               │
└──────────────────────────────────────────────────────────┘
```

### 6.3 Sin resultados con filtros

```
No encontramos productos con esos filtros.
[Limpiar filtros]
```

### 6.4 Filtros — comportamiento

- Los filtros se reflejan en la URL como query params para que el back/forward del navegador funcione.
- Cambiar un filtro **resetea la paginación a `page=1`**.
- Los chips de filtro activos se muestran arriba del listado y se pueden quitar uno por uno.

### 6.5 Pantalla `/historial/[id]` — detalle

Es la misma vista que la pantalla de resultado post-análisis (E03 §6.1), reusando los componentes. La única diferencia: el header dice "Producto guardado" en vez de "Análisis completado", y no hay CTA "Analizar otro" sino "Volver al historial".

---

## 7. Errores específicos

| `error` | HTTP | Cuándo |
|--------|------|--------|
| `not_found` | 404 | `GET /api/products/[id]` con id inexistente |
| `invalid_query` | 400 | query param inválido (ej. `page=abc`, `pageSize=999`) |
| `internal_error` | 500 | catch-all |

---

## 8. Logging

| Evento | Campos |
|--------|--------|
| `persist.created` | `requestId`, `productId`, `riesgo` |
| `persist.skipped_duplicate` | `requestId`, `existingId`, `fileHash` |
| `history.listed` | `requestId`, `filters`, `total`, `page` |
| `history.detail_viewed` | `requestId`, `productId` |
| `history.not_found` | `requestId`, `productId` |

---

## 9. Tests

**Unit**

- `mapCategoria` cubre todas las categorías + fallback `otros`.
- Serialización/deserialización de arrays (JSON.stringify ↔ JSON.parse).

**Integration**

- `POST /api/analyze` con archivo único → crea registro y `GET /api/products/[id]` devuelve los datos.
- `POST /api/analyze` con el MISMO archivo dos veces → segundo no crea registro, devuelve el primero.
- `GET /api/products?categoria=galletitas&riesgo=alto` → solo devuelve productos que cumplen ambos filtros.
- `GET /api/products?alergeno=gluten` → solo productos con `gluten` en `alergenos`.
- `GET /api/products?page=2&pageSize=10` con 25 productos → 10 items, `totalPages=3`.

**E2E (Playwright)**

- Flujo: analizar → ver en historial → abrir detalle → volver al historial preservando filtros.
- Estado vacío: vista limpia sin productos → muestra ilustración y CTA.

---

## 10. Decisiones técnicas y trade-offs

| Decisión | Alternativa descartada | Por qué |
|---------|----------------------|--------|
| Prisma + SQLite en dev | conexión directa a Postgres siempre | onboarding sin docker, demo más simple |
| Deduplicación por `fileHash` único | sin dedup | ahorra crédito de IA y storage |
| Filtros server-side | filtros client-side sobre el JSON completo | escala mejor, payload chico, paginación correcta |
| Filtros vía query params | estado en zustand/context | URLs compartibles + back/forward funciona |
| Imagen como `nombre = hash + ext` | nombre original del usuario | evita PII y colisiones |
| Sin endpoints de mutación pública | exponer PUT/DELETE | reduce superficie de bugs en MVP |
| Listado sin `jsonRaw` ni `pipelineTrace` | devolver todo | payload chico, refleja la UX (no se usan en list) |

---

## 11. Casos borde

- **Producto guardado pero imagen ausente del storage** (ej. se borró `/uploads`): el detalle igual responde 200, pero `imagenUrl` apunta a un 404. La UI muestra un placeholder ("Imagen no disponible"). No bloqueante.
- **PageSize gigante**: capeamos a `min(pageSize, 50)`. Devolvemos `400 invalid_query` si vino > 50 explícito.
- **Filtro inválido (ej. `categoria=invalida`)**: `400 invalid_query` con detalle del campo problemático.
- **Race en deduplicación**: si dos uploads del mismo hash llegan simultáneamente, el `unique` constraint hace que uno gane y el otro reciba un error de constraint. Lo capturamos y devolvemos el existente (igual que el path normal).
- **DB caída en demo**: el endpoint devuelve `internal_error` 500; logueamos como `db.unavailable`. La UI muestra el banner global de error.

---

## 12. Seed dataset (referenciado desde E06)

Para demo estable, `prisma/seed.ts` carga 25 productos cubriendo todas las categorías y los 3 niveles de riesgo. Detalle en E06 §6 (US-38).

---

## 13. Métricas

- `products.created_total` por día.
- `products.dup_rate` = registros saltados por dedup / análisis totales.
- p95 de `GET /api/products` (sin filtros, con filtros).
- Distribución de `pageSize` solicitados.
- Histograma de `confidence` de los productos guardados.
