# E02 — Análisis multimodal y extracción estructurada

> User stories del épico E02. Cubre RF-04, RF-05, RF-06, RF-14 y RNF-05, RNF-06.

---

## US-08 — Endpoint backend para analizar un archivo

**Story Points:** 5
**Prioridad MVP:** P0
**Épica:** E02

### Descripción

**Como** frontend,
**quiero** poder enviar un archivo a un endpoint `/api/analyze` y recibir el JSON estructurado,
**para** disparar el flujo de análisis desde la UI.

### Criterios de aceptación

**Escenario 1: Endpoint expuesto**

- **Dado** que tengo un archivo válido
- **Cuando** envío `POST /api/analyze` con el archivo como multipart
- **Entonces** recibo `200 OK` con el JSON estructurado o `4xx` con error estructurado

**Escenario 2: Respuesta en tiempo razonable**

- **Dado** que el archivo se envió correctamente
- **Cuando** el backend procesa la solicitud
- **Entonces** la respuesta llega en menos de 20 segundos para casos típicos

**Escenario 3: Logging del análisis**

- **Dado** que se ejecutó un análisis
- **Cuando** termina el procesamiento
- **Entonces** queda registrado timestamp, duración, tipo de archivo y resultado (ok/error)

---

## US-09 — Prompt + schema JSON consistente para extracción

**Story Points:** 5
**Prioridad MVP:** P0
**Épica:** E02

### Descripción

**Como** desarrollador de IA,
**quiero** un prompt versionado y un schema JSON definido,
**para** que la salida del modelo sea consistente y validable.

### Criterios de aceptación

**Escenario 1: Schema definido**

- **Dado** que existe un schema en `schemas/product.json`
- **Cuando** el modelo devuelve una salida
- **Entonces** la salida cumple el schema (campos `producto`, `categoria`, `ingredientes_detectados`, `alergenos`, `sellos`, `apto_*`, `riesgo`, `confidence`)

**Escenario 2: Salida inválida bloqueada**

- **Dado** que el modelo devuelve un JSON que no cumple schema
- **Cuando** el backend valida la salida
- **Entonces** rechaza la respuesta y aplica fallback (reintento con instrucción correctiva o error controlado)

**Escenario 3: Versionado del prompt**

- **Dado** que cambiamos el prompt
- **Cuando** ejecutamos un análisis
- **Entonces** queda registrada la versión del prompt utilizada para trazabilidad

---

## US-10 — Extracción de ingredientes visibles

**Story Points:** 3
**Prioridad MVP:** P0
**Épica:** E02

### Descripción

**Como** usuario,
**quiero** que el sistema extraiga la lista de ingredientes desde la etiqueta,
**para** ver qué contiene el producto sin tener que leer la etiqueta entera.

### Criterios de aceptación

**Escenario 1: Lista de ingredientes presente**

- **Dado** que la etiqueta muestra una lista de ingredientes legible
- **Cuando** el sistema procesa la imagen
- **Entonces** devuelve un array `ingredientes_detectados` con al menos los principales

**Escenario 2: Ingredientes no legibles**

- **Dado** que la zona de ingredientes está borrosa o cortada
- **Cuando** el sistema procesa la imagen
- **Entonces** devuelve `ingredientes_detectados: []` con `confidence` bajo
- **Y** la UI advierte que la extracción puede ser incompleta

---

## US-11 — Detección de alérgenos principales

**Story Points:** 5
**Prioridad MVP:** P0
**Épica:** E02

### Descripción

**Como** usuario con restricciones,
**quiero** que el sistema identifique los alérgenos presentes (gluten, leche, frutos secos, soja, huevo, etc.),
**para** decidir rápido si puedo consumir el producto.

### Criterios de aceptación

**Escenario 1: Alérgenos clásicos detectados**

- **Dado** que el producto contiene "harina de trigo" en los ingredientes
- **Cuando** el sistema procesa la etiqueta
- **Entonces** `alergenos` incluye "gluten"

**Escenario 2: Múltiples alérgenos**

- **Dado** que el producto contiene "leche en polvo" y "almendras"
- **Cuando** el sistema procesa la etiqueta
- **Entonces** `alergenos` incluye al menos "leche" y "frutos secos"

**Escenario 3: Sin alérgenos detectados**

- **Dado** que ningún ingrediente coincide con la lista de alérgenos conocidos
- **Cuando** el sistema procesa la etiqueta
- **Entonces** `alergenos` es un array vacío `[]`

---

## US-12 — Detección de sellos / advertencias visibles

**Story Points:** 3
**Prioridad MVP:** P0
**Épica:** E02

### Descripción

**Como** usuario,
**quiero** que el sistema reconozca los sellos de advertencia (exceso en azúcares, grasas, sodio, etc.),
**para** identificar productos críticos sin tener que interpretar la imagen.

### Criterios de aceptación

**Escenario 1: Sello presente en la etiqueta**

- **Dado** que la etiqueta tiene el sello "Exceso en azúcares"
- **Cuando** el sistema procesa la imagen
- **Entonces** `sellos` incluye "exceso en azúcares"

**Escenario 2: Múltiples sellos**

- **Dado** que el producto tiene dos o más sellos visibles
- **Cuando** el sistema procesa la imagen
- **Entonces** todos los sellos quedan en el array `sellos`

---

## US-13 — Detección de categoría del producto

**Story Points:** 2
**Prioridad MVP:** P0
**Épica:** E02

### Descripción

**Como** sistema,
**quiero** clasificar el producto en una categoría (galletitas, lácteos, snacks, bebidas, etc.),
**para** permitir filtros en el historial y consultas RAG por categoría.

### Criterios de aceptación

**Escenario 1: Categoría conocida**

- **Dado** que el producto es claramente identificable
- **Cuando** el sistema procesa la etiqueta
- **Entonces** `categoria` toma uno de los valores definidos en el catálogo (`galletitas`, `cereales`, `snacks`, `lácteos`, `bebidas`, `sin TACC`, `veganos`, `otros`)

**Escenario 2: Categoría desconocida**

- **Dado** que el producto no encaja en ninguna categoría conocida
- **Cuando** el sistema procesa la etiqueta
- **Entonces** `categoria` toma el valor `"otros"`

---

## US-14 — Confidence score y validación de schema

**Story Points:** 3
**Prioridad MVP:** P0
**Épica:** E02

### Descripción

**Como** sistema,
**quiero** devolver un score de confianza junto con el JSON y validarlo contra schema,
**para** detectar análisis de baja calidad antes de mostrárselos al usuario.

### Criterios de aceptación

**Escenario 1: Confidence presente**

- **Dado** que el modelo devolvió un análisis
- **Cuando** el backend valida la salida
- **Entonces** la respuesta incluye `confidence` como número entre 0 y 1

**Escenario 2: Schema válido**

- **Dado** que el JSON pasó la validación de schema
- **Cuando** el backend lo devuelve al frontend
- **Entonces** el frontend puede confiar en la estructura sin null-checks defensivos

**Escenario 3: Schema inválido → fallback**

- **Dado** que el modelo devolvió una salida que no cumple schema
- **Cuando** el backend la valida
- **Entonces** intenta un reintento correctivo
- **Y** si vuelve a fallar, devuelve `error: "extraction_invalid"` con detalle

---

## US-15 — Manejo de timeouts y errores del modelo

**Story Points:** 3
**Prioridad MVP:** P1
**Épica:** E02

### Descripción

**Como** sistema,
**quiero** manejar caídas, timeouts o rate limits del proveedor de IA,
**para** que la app no quede colgada y el usuario reciba un mensaje claro.

### Criterios de aceptación

**Escenario 1: Timeout del modelo**

- **Dado** que el modelo tarda más del timeout configurado (ej. 30s)
- **Cuando** el backend detecta el timeout
- **Entonces** corta la llamada y devuelve `error: "model_timeout"`
- **Y** la UI ofrece reintentar

**Escenario 2: Rate limit / error del proveedor**

- **Dado** que el proveedor devuelve 429 o 5xx
- **Cuando** el backend recibe la respuesta
- **Entonces** aplica backoff con un reintento adicional antes de devolver error
- **Y** loguea el incidente con código del proveedor
