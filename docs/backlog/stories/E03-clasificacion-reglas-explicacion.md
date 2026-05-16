# E03 — Clasificación, reglas y explicación

> User stories del épico E03. Cubre RF-07, RF-08, RF-09 y RNF-03, RNF-04.

---

## US-16 — Reglas de aptitud (vegano / celíaco / sin lactosa)

**Story Points:** 5
**Prioridad MVP:** P0
**Épica:** E03

### Descripción

**Como** sistema,
**quiero** evaluar la aptitud del producto contra reglas propias (vegano, celíaco, sin lactosa),
**para** dar al usuario una clasificación accionable sin depender solo del modelo.

### Criterios de aceptación

**Escenario 1: Producto con gluten → no apto celíaco**

- **Dado** que `alergenos` contiene "gluten" o ingredientes incluyen trigo/cebada/centeno/avena no certificada
- **Cuando** se aplican las reglas
- **Entonces** `apto_celiaco` es `false`

**Escenario 2: Producto con lácteos → no apto sin lactosa**

- **Dado** que ingredientes incluyen "leche", "lactosa", "suero" o derivados lácteos
- **Cuando** se aplican las reglas
- **Entonces** `apto_sin_lactosa` es `false`

**Escenario 3: Producto con origen animal → no apto vegano**

- **Dado** que ingredientes incluyen carne, leche, huevo, miel u otros derivados animales
- **Cuando** se aplican las reglas
- **Entonces** `apto_vegano` es `false`

**Escenario 4: Reglas configurables**

- **Dado** que las reglas viven en un archivo de configuración versionado
- **Cuando** un dev agrega un nuevo ingrediente a la lista negra
- **Entonces** las reglas se aplican sin redeploy del modelo

---

## US-17 — Cálculo de riesgo bajo / medio / alto

**Story Points:** 3
**Prioridad MVP:** P0
**Épica:** E03

### Descripción

**Como** usuario,
**quiero** ver una clasificación general de riesgo del producto,
**para** decidir rápido sin tener que leer todos los detalles.

### Criterios de aceptación

**Escenario 1: Producto con 2+ sellos → riesgo alto**

- **Dado** que el producto tiene 2 o más sellos de advertencia
- **Cuando** se calcula el riesgo
- **Entonces** `riesgo` es `"alto"`

**Escenario 2: Producto sin sellos ni alérgenos → riesgo bajo**

- **Dado** que el producto no tiene sellos y `alergenos` está vacío
- **Cuando** se calcula el riesgo
- **Entonces** `riesgo` es `"bajo"`

**Escenario 3: Producto con 1 sello o con alérgenos comunes → riesgo medio**

- **Dado** que el producto tiene exactamente 1 sello o tiene alérgenos pero sin sellos
- **Cuando** se calcula el riesgo
- **Entonces** `riesgo` es `"medio"`

**Escenario 4: Confianza baja → advertencia**

- **Dado** que el `confidence` está por debajo de 0.6
- **Cuando** se muestra el riesgo
- **Entonces** la UI agrega un cartel "Análisis con baja confianza, verificá manualmente"

---

## US-18 — Generación de explicación en lenguaje simple

**Story Points:** 5
**Prioridad MVP:** P0
**Épica:** E03

### Descripción

**Como** usuario,
**quiero** ver un resumen en lenguaje claro de por qué este producto tiene cierto riesgo,
**para** entender el resultado sin tener que interpretar JSON.

### Criterios de aceptación

**Escenario 1: Explicación generada**

- **Dado** que el análisis terminó con riesgo alto y alérgenos detectados
- **Cuando** el sistema genera la explicación
- **Entonces** muestra un párrafo de 2-3 oraciones explicando los motivos (ej. "Este producto no es recomendable para personas con celiaquía o intolerancia a la lactosa. Se detectan gluten, leche y alto contenido de azúcar.")

**Escenario 2: Tono informativo, no médico**

- **Dado** que la explicación se genera
- **Cuando** se valida el texto
- **Entonces** no contiene frases tipo "consultá a un médico", "es peligroso para tu salud" ni afirmaciones absolutas
- **Y** sí contiene un disclaimer breve sobre que el análisis depende de la información visible

**Escenario 3: Explicación adaptada al perfil**

- **Dado** que la app conoce el perfil del usuario (futuro)
- **Cuando** se genera la explicación
- **Entonces** prioriza las restricciones relevantes para ese perfil (este AC queda como nota para futuro, no es bloqueante)

---

## US-19 — Disclaimer visible de "no es consejo médico"

**Story Points:** 1
**Prioridad MVP:** P0
**Épica:** E03

### Descripción

**Como** equipo,
**quiero** que cada resultado de análisis incluya un disclaimer visible,
**para** dejar claro que NutriLens es informativo y no reemplaza a un profesional.

### Criterios de aceptación

**Escenario 1: Disclaimer en pantalla de resultado**

- **Dado** que el usuario ve un análisis procesado
- **Cuando** la UI renderiza la pantalla
- **Entonces** aparece un texto pequeño y visible: "NutriLens es un asistente informativo, no reemplaza el consejo de un profesional de nutrición."

**Escenario 2: Disclaimer en respuestas del chat**

- **Dado** que el chat genera una respuesta sobre productos guardados
- **Cuando** se renderiza
- **Entonces** la respuesta incluye o está acompañada del mismo disclaimer

---

## US-20 — Advertencia automática si confianza es baja

**Story Points:** 2
**Prioridad MVP:** P0
**Épica:** E03

### Descripción

**Como** usuario,
**quiero** que la app me avise cuando el análisis tiene baja confianza,
**para** no tomar decisiones basadas en datos poco confiables.

### Criterios de aceptación

**Escenario 1: Confianza por debajo del umbral**

- **Dado** que `confidence < 0.6`
- **Cuando** se muestra el resultado
- **Entonces** se muestra una badge "Confianza baja" + sugerencia de subir nueva imagen

**Escenario 2: Confianza alta**

- **Dado** que `confidence ≥ 0.8`
- **Cuando** se muestra el resultado
- **Entonces** no se muestra ninguna advertencia adicional
