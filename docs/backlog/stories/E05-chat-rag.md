# E05 — Chat con RAG sobre historial

> User stories del épico E05. Cubre RF-12.

---

## US-27 — Interfaz de chat sobre historial

**Story Points:** 3
**Prioridad MVP:** P1
**Épica:** E05

### Descripción

**Como** usuario,
**quiero** un chat donde escribir preguntas sobre los productos que tengo guardados,
**para** consultarlos en lenguaje natural sin armar filtros.

### Criterios de aceptación

**Escenario 1: Chat operativo**

- **Dado** que ingreso a la pantalla "Chat"
- **Cuando** escribo una pregunta y presiono Enter
- **Entonces** veo el mensaje del usuario, un indicador de "Pensando..." y luego la respuesta del sistema

**Escenario 2: Persistencia de la conversación en sesión**

- **Dado** que tengo una conversación en curso
- **Cuando** sigo escribiendo
- **Entonces** los mensajes previos se mantienen visibles en la sesión (no es necesario persistirlos en DB para el MVP)

**Escenario 3: Reset de conversación**

- **Dado** que tengo una conversación en curso
- **Cuando** presiono "Nueva conversación"
- **Entonces** se limpia el chat

---

## US-28 — Retrieval por filtros y palabras clave sobre el historial

**Story Points:** 5
**Prioridad MVP:** P1
**Épica:** E05

### Descripción

**Como** sistema,
**quiero** buscar en el historial los productos relevantes a la pregunta del usuario,
**para** usarlos como contexto al generar la respuesta (RAG).

### Criterios de aceptación

**Escenario 1: Pregunta con categoría explícita**

- **Dado** que el usuario pregunta "mostrame galletitas aptas para celíacos"
- **Cuando** el sistema interpreta la intención
- **Entonces** recupera productos donde `categoria = galletitas` y `apto_celiaco = true`

**Escenario 2: Pregunta con alérgeno**

- **Dado** que el usuario pregunta "qué productos tengo con leche"
- **Cuando** el sistema interpreta la intención
- **Entonces** recupera productos donde `alergenos` contiene "leche"

**Escenario 3: Pregunta abierta**

- **Dado** que el usuario pregunta "dame galletitas con mejor perfil nutricional"
- **Cuando** el sistema interpreta la intención
- **Entonces** recupera productos de categoría `galletitas` ordenados por menor riesgo y menos sellos

**Escenario 4: Sin productos relevantes**

- **Dado** que el filtro no devuelve productos
- **Cuando** se ejecuta el retrieval
- **Entonces** devuelve array vacío al paso siguiente del flujo

---

## US-29 — Generación de respuesta con contexto recuperado

**Story Points:** 5
**Prioridad MVP:** P1
**Épica:** E05

### Descripción

**Como** sistema,
**quiero** enviar los productos recuperados al LLM como contexto y generar una respuesta fundamentada,
**para** que la respuesta esté basada en datos reales del usuario y no en alucinaciones.

### Criterios de aceptación

**Escenario 1: Respuesta basada en contexto**

- **Dado** que se recuperaron N productos relevantes
- **Cuando** el sistema invoca al LLM con la pregunta + los productos como contexto
- **Entonces** la respuesta menciona explícitamente productos del contexto (nombres, riesgos, etc.)
- **Y** NO inventa productos que no estén en el contexto

**Escenario 2: Disclaimer en la respuesta**

- **Dado** que el sistema genera una respuesta
- **Cuando** la muestra al usuario
- **Entonces** incluye un disclaimer breve "Basado en productos analizados por vos"

**Escenario 3: Prompt versionado**

- **Dado** que el prompt de RAG vive en archivo de configuración
- **Cuando** se ejecuta una consulta
- **Entonces** queda registrada la versión del prompt para trazabilidad

---

## US-30 — Caso sin productos relevantes en el historial

**Story Points:** 2
**Prioridad MVP:** P1
**Épica:** E05

### Descripción

**Como** usuario,
**quiero** entender cuándo no tengo información suficiente en mi historial,
**para** saber que necesito analizar más productos.

### Criterios de aceptación

**Escenario 1: Retrieval vacío**

- **Dado** que el sistema no encontró productos relevantes a la pregunta
- **Cuando** se intenta responder
- **Entonces** muestra "No tengo productos guardados que respondan a esa pregunta. Subí más etiquetas para enriquecer tu historial."
- **Y** NO invoca al LLM para ahorrar tokens

**Escenario 2: Sugerencia accionable**

- **Dado** que la respuesta es vacía
- **Cuando** se muestra
- **Entonces** incluye un botón "Analizar nuevo producto" hacia upload

---

## US-31 — Comparación entre dos productos

**Story Points:** 5
**Prioridad MVP:** P2
**Épica:** E05

### Descripción

**Como** usuario,
**quiero** pedirle al chat que compare dos productos guardados,
**para** elegir cuál conviene más según mis criterios.

### Criterios de aceptación

**Escenario 1: Comparación pedida explícitamente**

- **Dado** que escribo "comparame Galletitas X con Galletitas Y"
- **Cuando** el sistema interpreta la intención
- **Entonces** recupera ambos productos del historial
- **Y** genera una respuesta que contrasta ingredientes, alérgenos, sellos y riesgo

**Escenario 2: Producto no existe en historial**

- **Dado** que uno de los productos mencionados no está guardado
- **Cuando** se intenta la comparación
- **Entonces** la respuesta indica qué producto falta y sugiere analizarlo

---

## US-32 — Mostrar productos recuperados como contexto en la UI

**Story Points:** 3
**Prioridad MVP:** P1
**Épica:** E05

### Descripción

**Como** usuario,
**quiero** ver qué productos del historial usó el sistema para responderme,
**para** confiar en la respuesta y poder profundizar en cada producto.

### Criterios de aceptación

**Escenario 1: Lista de productos usados**

- **Dado** que el sistema generó una respuesta usando 3 productos del historial
- **Cuando** la respuesta se muestra
- **Entonces** debajo aparecen 3 chips/cards con nombre y riesgo de cada producto

**Escenario 2: Click en chip → detalle**

- **Dado** que veo un chip de producto
- **Cuando** lo clickeo
- **Entonces** se abre la vista de detalle de ese producto

**Escenario 3: Respuesta sin contexto**

- **Dado** que la respuesta no usó productos del historial
- **Cuando** se renderiza
- **Entonces** no se muestran chips (sección oculta)
