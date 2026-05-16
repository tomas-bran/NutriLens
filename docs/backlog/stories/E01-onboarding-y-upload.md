# E01 — Onboarding & Upload de etiquetas

> User stories del épico E01. Cubre RF-01, RF-02, RF-03, RF-13.

---

## US-01 — Subir imagen de etiqueta desde el dispositivo

**Story Points:** 3
**Prioridad MVP:** P0
**Épica:** E01

### Descripción
**Como** usuario general,
**quiero** subir una foto de la etiqueta de un producto desde mi dispositivo,
**para** que el sistema pueda analizarla y darme información estructurada.

### Criterios de aceptación

**Escenario 1: Subida exitosa de imagen JPG/PNG**
- **Dado** que estoy en la pantalla de inicio
- **Cuando** selecciono una imagen JPG o PNG de menos de 10 MB
- **Entonces** el archivo se carga y aparece el estado "Archivo cargado"
- **Y** se habilita el botón "Analizar producto"

**Escenario 2: Formato no soportado**
- **Dado** que selecciono un archivo que no es imagen ni PDF (ej. .docx)
- **Cuando** intento cargarlo
- **Entonces** el sistema rechaza el archivo
- **Y** muestra el mensaje "Formato no soportado. Subí una imagen (JPG/PNG) o un PDF."

---

## US-02 — Subir PDF de etiqueta

**Story Points:** 2
**Prioridad MVP:** P0
**Épica:** E01

### Descripción
**Como** usuario general,
**quiero** subir un PDF con la información del producto,
**para** poder analizar fichas técnicas o etiquetas digitalizadas.

### Criterios de aceptación

**Escenario 1: Subida exitosa de PDF**
- **Dado** que estoy en la pantalla de inicio
- **Cuando** subo un archivo PDF de menos de 10 MB
- **Entonces** el sistema lo acepta como entrada válida
- **Y** muestra el estado "Archivo cargado"

**Escenario 2: PDF dañado o ilegible**
- **Dado** que subí un PDF que no puede ser leído
- **Cuando** el sistema intenta procesarlo
- **Entonces** devuelve error estructurado con `error: "pdf_unreadable"`
- **Y** la UI muestra "No pudimos leer el PDF. Intentá con otro archivo."

---

## US-03 — Validación de tipo y tamaño de archivo

**Story Points:** 2
**Prioridad MVP:** P0
**Épica:** E01

### Descripción
**Como** sistema,
**quiero** validar el tipo MIME y el tamaño del archivo antes de procesarlo,
**para** evitar consumir recursos en archivos inválidos.

### Criterios de aceptación

**Escenario 1: Tamaño máximo permitido**
- **Dado** que un archivo pesa más de 10 MB
- **Cuando** el usuario intenta subirlo
- **Entonces** el sistema lo rechaza antes de subirlo al backend
- **Y** muestra "El archivo supera el tamaño máximo de 10 MB."

**Escenario 2: MIME type válido**
- **Dado** que el archivo tiene MIME type `image/jpeg`, `image/png` o `application/pdf`
- **Cuando** el sistema lo valida
- **Entonces** lo acepta y pasa a la siguiente etapa del pipeline

---

## US-04 — Estados visuales del flujo de upload

**Story Points:** 2
**Prioridad MVP:** P0
**Épica:** E01

### Descripción
**Como** usuario,
**quiero** ver claramente en qué estado está mi archivo (cargado, procesando, completado, error),
**para** saber qué está pasando en cada momento.

### Criterios de aceptación

**Escenario 1: Estados visibles**
- **Dado** que subí un archivo válido
- **Cuando** el sistema procesa el flujo
- **Entonces** veo los estados "Archivo cargado" → "Procesando imagen" → "Análisis completado"
- **Y** cada estado tiene un indicador visual claro (icono o spinner)

**Escenario 2: Error visible**
- **Dado** que ocurre un error en cualquier etapa
- **Cuando** el sistema lo detecta
- **Entonces** el flujo se interrumpe
- **Y** se muestra un estado de error con mensaje legible y opción de reintentar

---

## US-05 — Validar que el archivo corresponde a una etiqueta alimentaria

**Story Points:** 5
**Prioridad MVP:** P0
**Épica:** E01

### Descripción
**Como** sistema,
**quiero** verificar que la imagen o PDF subido sea una etiqueta alimentaria,
**para** evitar análisis sobre imágenes irrelevantes.

### Criterios de aceptación

**Escenario 1: Imagen no es etiqueta alimentaria**
- **Dado** que el usuario sube una foto de un paisaje o de una persona
- **Cuando** el sistema valida el contenido con el modelo
- **Entonces** devuelve `{ "error": "image_not_supported", "reason": "La imagen no parece corresponder a una etiqueta alimentaria." }`
- **Y** la UI muestra el mensaje y permite subir otro archivo

**Escenario 2: Etiqueta válida**
- **Dado** que la imagen contiene una etiqueta alimentaria reconocible
- **Cuando** el sistema valida el contenido
- **Entonces** continúa con el pipeline de extracción

**Escenario 3: Baja confianza de validación**
- **Dado** que el modelo no está seguro de si es etiqueta alimentaria
- **Cuando** la confianza está por debajo del umbral configurado
- **Entonces** el sistema avisa al usuario y le pide confirmación para continuar

---

## US-06 — Pantalla de error con motivo claro

**Story Points:** 2
**Prioridad MVP:** P0
**Épica:** E01

### Descripción
**Como** usuario,
**quiero** que cuando algo falla se me explique el motivo y qué puedo hacer,
**para** no quedarme bloqueado sin entender qué pasó.

### Criterios de aceptación

**Escenario 1: Mensaje legible y accionable**
- **Dado** que el sistema devolvió un error estructurado
- **Cuando** la UI lo muestra
- **Entonces** veo un mensaje en lenguaje claro (no códigos técnicos)
- **Y** veo un botón "Probar con otro archivo" que me devuelve a la pantalla de upload

**Escenario 2: Logging del error**
- **Dado** que un error fue mostrado al usuario
- **Cuando** el evento ocurre
- **Entonces** queda registrado en logs con tipo de error, momento y archivo (sin contenido sensible)

---

## US-07 — Pantalla de inicio con instrucciones y ejemplos

**Story Points:** 3
**Prioridad MVP:** P1
**Épica:** E01

### Descripción
**Como** usuario que ingresa por primera vez,
**quiero** ver una explicación corta de qué hace la app y ejemplos de imágenes válidas,
**para** subir el tipo correcto de archivo desde el principio.

### Criterios de aceptación

**Escenario 1: Pantalla informativa**
- **Dado** que ingreso a NutriLens por primera vez
- **Cuando** se carga la pantalla de inicio
- **Entonces** veo el título, una descripción de una línea, un botón de upload y un bloque "Cómo funciona" con 2 o 3 ejemplos de imágenes válidas

**Escenario 2: Acceso al historial**
- **Dado** que estoy en la pantalla de inicio
- **Cuando** ya tengo productos analizados previamente
- **Entonces** veo un acceso directo a "Mi historial"
