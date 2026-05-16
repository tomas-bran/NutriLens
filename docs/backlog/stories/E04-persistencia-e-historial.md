# E04 — Persistencia e historial

> User stories del épico E04. Cubre RF-10, RF-11.

---

## US-21 — Modelo de datos del producto analizado

**Story Points:** 3
**Prioridad MVP:** P0
**Épica:** E04

### Descripción
**Como** desarrollador backend,
**quiero** un modelo de datos definido para el producto analizado,
**para** que la persistencia y las consultas sean predecibles.

### Criterios de aceptación

**Escenario 1: Schema de tabla `products` definido**
- **Dado** que iniciamos la app
- **Cuando** se aplica la migración inicial
- **Entonces** existe la tabla/colección `products` con campos: `id`, `nombre`, `categoria`, `ingredientes` (array), `alergenos` (array), `sellos` (array), `apto_vegano`, `apto_celiaco`, `apto_sin_lactosa`, `riesgo`, `confidence`, `json_raw`, `imagen_path`, `created_at`

**Escenario 2: ID único**
- **Dado** que se guarda un producto
- **Cuando** se persiste
- **Entonces** se asigna un `id` único (UUID o autoincremental)

---

## US-22 — Guardar análisis tras procesamiento exitoso

**Story Points:** 3
**Prioridad MVP:** P0
**Épica:** E04

### Descripción
**Como** sistema,
**quiero** persistir cada análisis exitoso en la base,
**para** que el usuario pueda consultarlo después y para alimentar el chat RAG.

### Criterios de aceptación

**Escenario 1: Persistencia automática**
- **Dado** que el análisis terminó sin errores y pasó la validación de schema
- **Cuando** el backend recibe el JSON validado
- **Entonces** crea un registro en `products` con todos los campos
- **Y** guarda la imagen asociada en `/uploads` o storage equivalente

**Escenario 2: Análisis con error no se persiste**
- **Dado** que el análisis falló o devolvió error estructurado
- **Cuando** el backend lo procesa
- **Entonces** NO se crea registro en `products`
- **Y** el evento queda solo en logs

**Escenario 3: Duplicado por imagen**
- **Dado** que el usuario sube la misma imagen dos veces
- **Cuando** el sistema detecta hash idéntico
- **Entonces** muestra el análisis previo en lugar de procesar otra vez (decisión de implementación opcional)

---

## US-23 — Listar historial de productos analizados

**Story Points:** 3
**Prioridad MVP:** P0
**Épica:** E04

### Descripción
**Como** usuario,
**quiero** ver una lista de los productos que ya analicé,
**para** consultarlos sin tener que volver a procesarlos.

### Criterios de aceptación

**Escenario 1: Listado básico**
- **Dado** que tengo productos guardados
- **Cuando** ingreso a la pantalla "Historial"
- **Entonces** veo una lista con nombre, categoría, riesgo y fecha de cada producto
- **Y** la lista está ordenada por `created_at` descendente

**Escenario 2: Paginación o scroll**
- **Dado** que tengo más de 20 productos guardados
- **Cuando** scrolleo la lista
- **Entonces** se cargan más resultados (paginación o infinite scroll)

**Escenario 3: Endpoint del historial**
- **Dado** que la UI necesita la lista
- **Cuando** llama `GET /api/products`
- **Entonces** recibe un array con los campos mínimos para el listado (no el JSON completo)

---

## US-24 — Filtros por categoría, riesgo y alérgenos

**Story Points:** 5
**Prioridad MVP:** P1
**Épica:** E04

### Descripción
**Como** usuario,
**quiero** filtrar el historial por categoría, riesgo y alérgenos,
**para** encontrar rápidamente productos relevantes.

### Criterios de aceptación

**Escenario 1: Filtro por categoría**
- **Dado** que estoy en el historial
- **Cuando** aplico el filtro "categoría = galletitas"
- **Entonces** la lista muestra solo productos de esa categoría

**Escenario 2: Filtro por riesgo**
- **Dado** que estoy en el historial
- **Cuando** aplico el filtro "riesgo = alto"
- **Entonces** solo veo productos con riesgo alto

**Escenario 3: Filtro por alérgeno**
- **Dado** que estoy en el historial
- **Cuando** aplico el filtro "alérgeno = gluten"
- **Entonces** solo veo productos que contienen gluten en `alergenos`

**Escenario 4: Combinación de filtros**
- **Dado** que aplico varios filtros simultáneamente
- **Cuando** se evalúan
- **Entonces** la lista cumple AND entre filtros

**Escenario 5: Sin resultados**
- **Dado** que ningún producto cumple los filtros
- **Cuando** se aplica el filtro
- **Entonces** se muestra un estado "Sin resultados" con opción "Limpiar filtros"

---

## US-25 — Detalle de producto guardado

**Story Points:** 3
**Prioridad MVP:** P0
**Épica:** E04

### Descripción
**Como** usuario,
**quiero** abrir el detalle de un producto del historial,
**para** ver toda la información extraída sin tener que reanalizarlo.

### Criterios de aceptación

**Escenario 1: Vista de detalle completa**
- **Dado** que selecciono un producto del historial
- **Cuando** se abre la vista de detalle
- **Entonces** veo imagen, nombre, categoría, riesgo, aptitudes, alérgenos, sellos, ingredientes, explicación y JSON completo

**Escenario 2: Endpoint de detalle**
- **Dado** que la UI necesita el detalle
- **Cuando** llama `GET /api/products/:id`
- **Entonces** recibe el producto completo (incluyendo `json_raw`)

**Escenario 3: Producto no encontrado**
- **Dado** que el id no existe en la base
- **Cuando** la UI lo solicita
- **Entonces** recibe `404` con error estructurado y la UI muestra "Producto no encontrado"

---

## US-26 — Estado vacío del historial

**Story Points:** 1
**Prioridad MVP:** P0
**Épica:** E04

### Descripción
**Como** usuario,
**quiero** entender qué hacer cuando todavía no tengo productos analizados,
**para** no quedarme mirando una pantalla vacía.

### Criterios de aceptación

**Escenario 1: Historial vacío**
- **Dado** que no tengo productos guardados
- **Cuando** ingreso al historial
- **Entonces** veo una ilustración + texto "Todavía no analizaste ningún producto" + botón "Analizar mi primer producto" que me lleva a upload
