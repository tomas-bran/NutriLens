# Handoff técnico — NutriWorld

# Objetivo de NutriWorld

Construir una primera versión funcional de NutriWorld donde:

1. El usuario controla un personaje en tercera persona.

2. Existe un NPC llamado **NutriLens**, que actúa como asistente guía.

3. El usuario puede escribir una consulta, por ejemplo:

   > “Mostrame galletitas aptas para celíacos”

4. El sistema interpreta la consulta.

5. Busca productos compatibles en una base mockeada o real de NutriLens.

6. El NPC NutriLens responde con texto.

7. El NPC camina hacia la góndola correspondiente.

8. El usuario puede seguirlo.

9. Al llegar, se resaltan los productos recomendados.

10. Al interactuar con un producto, se muestra una ficha nutricional resumida.

A priori la versión beta será **solo desktop**.

---

# Principio de diseño

NutriWorld debe ser útil, no solamente decorativo.

La experiencia debe representar esto:

> El usuario no navega menús complejos: le pregunta al asistente y el asistente lo guía físicamente hacia la zona o producto correcto dentro del mundo 3D.

Ejemplo de flujo:

```txt
Usuario:
"Mostrame galletitas aptas para celíacos"

NutriLens:
"Encontré 3 opciones aptas para celíacos. Acompañame a la góndola Sin TACC."

Acción:
El NPC camina hacia la góndola Sin TACC.
Los productos recomendados se iluminan.
El usuario puede hacer click/interactuar para ver detalle.
```

---

# Stack sugerido

Usar:

* **Next.js + React + TypeScript**
* **React Three Fiber** para integrar Three.js con React.
* **@react-three/drei** para helpers: cámara, controles, texto 3D, loaders.
* **zustand** o estado React simple para estado global.
* **Tailwind CSS** para overlays 2D.
* Mock data local para productos al inicio.
* Endpoint interno opcional para agente IA.

**React Three Fiber** permite declarar escenas 3D como componentes React.

---

# Alcance de la versión beta

## Debe incluir

### 1. Escena 3D básica

Una escena pequeña tipo supermercado con:

* Piso.
* Iluminación.
* 3 góndolas o zonas.
* Productos representados como cajas simples.
* Carteles visibles:

  * “Sin TACC”
  * “Vegano”
  * “Sin lactosa”
  * “Snacks”
  * “Galletitas”

No necesitamos modelos 3D complejos. Se pueden usar cajas, planos, colores y textos.

---

### 2. Personaje del usuario

Un avatar simple controlable con teclado:

* `WASD` o flechas para moverse.
* Cámara en tercera persona.
* Movimiento básico sobre plano.
* No hace falta animación compleja.
* Puede ser una cápsula, modelo simple o placeholder.

Controles esperados:

```txt
W / ↑ = avanzar
S / ↓ = retroceder
A / ← = izquierda
D / → = derecha
Shift = correr, opcional
E = interactuar
```

---

### 3. NPC NutriLens

Un personaje guía controlado por el sistema.

Puede ser:

* Robot simple.
* Mascota.
* Cápsula con cara.
* Modelo GLTF si existe, pero no es obligatorio.

Debe tener:

* Nombre visible: “NutriLens”.
* Burbuja de diálogo.
* Capacidad de moverse hacia una zona objetivo.
* Estado visible:

  * idle
  * thinking
  * guiding
  * arrived

---

### 4. Input de consulta

Overlay 2D sobre la escena.

Debe incluir:

* Campo de texto.
* Botón “Preguntar”.
* Ejemplos rápidos:

  * “Mostrame galletitas aptas para celíacos”
  * “Quiero algo sin lactosa”
  * “Buscá snacks de riesgo bajo”
  * “Mostrame productos veganos”

Por ahora no hace falta reconocimiento de voz. La voz se puede agregar luego con ElevenLabs.

---

### 5. Interpretación de consulta

Para la beta podemos implementar una capa simple de parsing con reglas y dejar preparada la interfaz para IA real.

Ejemplo:

```ts
type ParsedIntent = {
  intent: "find_products";
  category?: string;
  filters: {
    apto_celiaco?: boolean;
    apto_sin_lactosa?: boolean;
    apto_vegano?: boolean;
    max_riesgo?: "bajo" | "medio" | "alto";
  };
  targetZone: string;
};
```

Ejemplo de entrada:

```txt
"Mostrame galletitas aptas para celíacos"
```

Salida esperada:

```json
{
  "intent": "find_products",
  "category": "galletitas",
  "filters": {
    "apto_celiaco": true
  },
  "targetZone": "sin_tacc"
}
```

Luego puede reemplazarse por un endpoint IA que devuelva esta misma estructura.

---

### 6. Base mockeada de productos

Crear un archivo `products.ts` con productos mockeados.

Ejemplo:

```ts
export type Product = {
  id: string;
  name: string;
  category: "galletitas" | "snacks" | "bebidas" | "cereales";
  zone: "sin_tacc" | "vegano" | "sin_lactosa" | "snacks";
  risk: "bajo" | "medio" | "alto";
  aptoCeliaco: boolean;
  aptoSinLactosa: boolean;
  aptoVegano: boolean;
  allergens: string[];
  seals: string[];
  ingredients: string[];
  explanation: string;
  position: [number, number, number];
};
```

Productos mínimos:

```ts
export const products: Product[] = [
  {
    id: "prod_avena_sintacc",
    name: "Avena Crunch Sin TACC",
    category: "galletitas",
    zone: "sin_tacc",
    risk: "bajo",
    aptoCeliaco: true,
    aptoSinLactosa: true,
    aptoVegano: true,
    allergens: [],
    seals: [],
    ingredients: ["harina de avena sin TACC", "azúcar mascabo", "aceite de girasol", "chips de chocolate"],
    explanation: "Buena opción dentro de galletitas porque no tiene gluten detectado y posee riesgo bajo.",
    position: [8, 1, -4]
  },
  {
    id: "prod_rice_cookies",
    name: "Rice Cookies",
    category: "galletitas",
    zone: "sin_tacc",
    risk: "bajo",
    aptoCeliaco: true,
    aptoSinLactosa: true,
    aptoVegano: false,
    allergens: [],
    seals: [],
    ingredients: ["harina de arroz", "aceite vegetal", "azúcar"],
    explanation: "Opción apta para celíacos según los datos cargados. Riesgo bajo.",
    position: [10, 1, -4]
  },
  {
    id: "prod_choco_crunch",
    name: "Choco Crunch",
    category: "galletitas",
    zone: "snacks",
    risk: "alto",
    aptoCeliaco: false,
    aptoSinLactosa: false,
    aptoVegano: false,
    allergens: ["gluten", "leche"],
    seals: ["exceso en azúcares", "exceso en grasas saturadas"],
    ingredients: ["harina de trigo", "azúcar", "leche en polvo", "cacao"],
    explanation: "No recomendable para personas celíacas o con intolerancia a la lactosa.",
    position: [-6, 1, -2]
  }
];
```

---

### 7. Búsqueda de productos

Implementar función:

```ts
function findProducts(intent: ParsedIntent, products: Product[]): Product[] {
  return products.filter(product => {
    if (intent.category && product.category !== intent.category) return false;

    if (intent.filters.apto_celiaco && !product.aptoCeliaco) return false;
    if (intent.filters.apto_sin_lactosa && !product.aptoSinLactosa) return false;
    if (intent.filters.apto_vegano && !product.aptoVegano) return false;

    if (intent.filters.max_riesgo === "bajo" && product.risk !== "bajo") return false;

    return true;
  });
}
```

---

### 8. Movimiento del NPC

Definir zonas fijas:

```ts
export const zones = {
  sin_tacc: { label: "Sin TACC", position: [8, 0, -4] },
  vegano: { label: "Vegano", position: [-8, 0, 4] },
  sin_lactosa: { label: "Sin lactosa", position: [4, 0, 8] },
  snacks: { label: "Snacks", position: [-6, 0, -2] }
};
```

Cuando el agente devuelva `targetZone`, el NPC debe caminar hacia `zones[targetZone].position`.

Movimiento simple:

```ts
direction = target - npc.position
npc.position += normalized(direction) * speed * delta
```

No hace falta pathfinding avanzado. Las góndolas deben ubicarse de forma que el NPC pueda ir en línea recta.

**Pathfinding** es la búsqueda de caminos evitando obstáculos. Para la β no es necesario.

---

### 9. Resaltado de productos

Los productos encontrados deben destacarse visualmente:

* Contorno verde.
* Brillo suave.
* Animación de pulso.
* Etiqueta flotante con nombre.

Ejemplo:

```txt
Avena Crunch Sin TACC
Riesgo bajo
Apto celíaco
```

---

### 10. Interacción con productos

Cuando el usuario se acerca a un producto recomendado y presiona `E`, debe abrirse un panel 2D con detalle.

El panel debe mostrar:

* Nombre del producto.
* Riesgo.
* Apto celíaco: sí/no.
* Apto sin lactosa: sí/no.
* Apto vegano: sí/no.
* Ingredientes.
* Alérgenos.
* Sellos.
* Explicación.

---

# Estados principales

Usar un estado global simple:

```ts
type NutriWorldState = {
  query: string;
  parsedIntent: ParsedIntent | null;
  recommendedProducts: Product[];
  highlightedProductIds: string[];
  npcState: "idle" | "thinking" | "guiding" | "arrived";
  npcTargetZone: string | null;
  selectedProductId: string | null;
  assistantMessage: string | null;
};
```

---

# Comportamiento esperado

## Caso 1: consulta exitosa

Entrada:

```txt
Mostrame galletitas aptas para celíacos
```

Salida:

```txt
Encontré 2 galletitas aptas para celíacos. Acompañame a la góndola Sin TACC.
```

Acción:

* NPC cambia a estado `guiding`.
* NPC camina a zona `sin_tacc`.
* Productos compatibles se resaltan.
* Al llegar cambia a `arrived`.

---

## Caso 2: sin resultados

Entrada:

```txt
Mostrame chocolates veganos sin lactosa
```

Si no hay productos:

```txt
No encontré productos que cumplan exactamente esos criterios. Puedo mostrarte alternativas cercanas.
```

Acción:

* NPC no se mueve.
* UI muestra alternativas si existen.

---

## Caso 3: consulta ambigua

Entrada:

```txt
Mostrame algo saludable
```

Respuesta:

```txt
¿Querés que priorice bajo azúcar, sin sellos o apto para alguna restricción?
```

Acción:

* NPC queda en `thinking`.
* No guía todavía.

---

# Integración posterior con IA real

La β puede arrancar con parser por reglas. Luego reemplazar por un endpoint:

```ts
POST /api/nutriworld/agent
```

Body:

```json
{
  "query": "Mostrame galletitas aptas para celíacos",
  "availableProducts": [...]
}
```

Response:

```json
{
  "message": "Encontré 2 galletitas aptas para celíacos. Acompañame a la góndola Sin TACC.",
  "intent": "find_products",
  "category": "galletitas",
  "filters": {
    "apto_celiaco": true
  },
  "targetZone": "sin_tacc",
  "highlightProductIds": ["prod_avena_sintacc", "prod_rice_cookies"]
}
```

---

# Integración posterior con ElevenLabs

Para la β inicial, mostrar solo texto.

Luego agregar voz:

1. El agente genera `assistantMessage`.
2. Se envía el texto a ElevenLabs.
3. ElevenLabs devuelve audio.
4. Se reproduce en el navegador.

Endpoint sugerido:

```ts
POST /api/voice/speak
```

Body:

```json
{
  "text": "Encontré 2 galletitas aptas para celíacos. Acompañame a la góndola Sin TACC."
}
```

Response:

```json
{
  "audioUrl": "/generated/audio/response.mp3"
}
```

En la UI agregar:

* Icono de parlante.
* Estado “NutriLens hablando”.
* Botón mute/unmute.

---

# Estructura sugerida de carpetas

```txt
/src
  /app
    /nutriworld
      page.tsx
    /api
      /nutriworld
        /agent
          route.ts
      /voice
        /speak
          route.ts

  /features
    /nutriworld
      NutriWorldScene.tsx
      Player.tsx
      NutriLensNPC.tsx
      ProductShelf.tsx
      ProductItem.tsx
      ProductDetailPanel.tsx
      AssistantOverlay.tsx
      HudControls.tsx
      data
        products.ts
        zones.ts
      logic
        parseQuery.ts
        findProducts.ts
        getAssistantMessage.ts
      store
        useNutriWorldStore.ts
```

---

# Componentes principales

## `NutriWorldScene.tsx`

Responsable de:

* Canvas 3D.
* Luces.
* Cámara.
* Piso.
* Góndolas.
* Player.
* NPC.
* Productos.

## `Player.tsx`

Responsable de:

* Movimiento del usuario.
* Input WASD.
* Posición.
* Interacción con productos cercanos.

## `NutriLensNPC.tsx`

Responsable de:

* Mostrar el personaje NutriLens.
* Mostrar nombre y burbuja.
* Moverse hacia zona objetivo.
* Cambiar estado visual.

## `ProductShelf.tsx`

Responsable de:

* Renderizar góndola.
* Cartel de zona.
* Productos ubicados en esa zona.

## `ProductItem.tsx`

Responsable de:

* Renderizar producto.
* Highlight si fue recomendado.
* Detectar cercanía o click.
* Abrir detalle.

## `AssistantOverlay.tsx`

Responsable de:

* Input de consulta.
* Botón preguntar.
* Mensaje del asistente.
* Estado del agente.

## `ProductDetailPanel.tsx`

Responsable de:

* Mostrar ficha del producto seleccionado.

---

# Criterios de aceptación

La versión β se considera funcional si:

* El usuario puede entrar a `/nutriworld`.
* Se renderiza una escena 3D estable.
* El usuario puede moverse con teclado.
* Hay un NPC visible llamado NutriLens.
* El usuario puede escribir una consulta.
* La consulta “Mostrame galletitas aptas para celíacos” devuelve productos compatibles.
* El NPC responde con texto.
* El NPC camina hacia la góndola Sin TACC.
* Los productos recomendados se resaltan.
* El usuario puede interactuar con al menos un producto.
* Se abre una ficha de producto.
* No hay errores críticos en consola.
* La experiencia funciona en desktop.

---

# Reglas de implementación

* Priorizar funcionalidad sobre realismo visual.
* No implementar mobile todavía.
* No implementar multijugador.
* No implementar mundo abierto.
* No implementar pathfinding avanzado.
* No depender de modelos 3D pesados.
* Mantener todo testeable con mock data.
* Diseñar la lógica para que luego pueda reemplazarse el parser por un agente IA real.
* Separar lógica de productos de la lógica visual 3D.

---

# Testing mínimo recomendado

Agregar tests unitarios para:

## `parseQuery`

Casos:

```txt
"Mostrame galletitas aptas para celíacos"
→ category: galletitas, apto_celiaco: true, targetZone: sin_tacc

"Quiero algo sin lactosa"
→ apto_sin_lactosa: true, targetZone: sin_lactosa

"Buscá productos veganos"
→ apto_vegano: true, targetZone: vegano
```

## `findProducts`

Casos:

```txt
Filtro apto_celiaco true
→ devuelve solo productos con aptoCeliaco true

Filtro categoría galletitas + apto_celiaco true
→ devuelve solo galletitas aptas para celíacos

Filtro sin resultados
→ devuelve []
```

## UI manual

* El NPC llega a la góndola correcta.
* Los productos correctos se resaltan.
* La ficha se abre al interactuar.
* Consulta ambigua no mueve el NPC.

---

# Resultado esperado para la demo

Demo ideal:

1. Entramos a NutriWorld.

2. Se ve el personaje del usuario y NutriLens.

3. Escribimos:

   > “Mostrame galletitas aptas para celíacos”

4. NutriLens responde:

   > “Encontré N opciones. Acompañame a la góndola Sin TACC.”

5. NutriLens camina hacia la góndola.

6. El usuario lo sigue.

7. Se iluminan los productos.

8. Se abre la ficha de, por ejemplo: “Avena Crunch Sin TACC”.

9. Se muestra por qué es apta y de riesgo bajo.

---

# Must be:

* Integrar agente real con LLM.
* Agregar animaciones al NPC.
* Agregar productos reales de la base NutriLens.
* Agregar RAG real con embeddings.
* Agregar comparación entre productos dentro del mundo.
* Agregar minimapa.

---

# Futuras mejoras

Después de la beta:

* Integrar ElevenLabs para voz.
* Agregar speech-to-text para que el usuario hable.
* Agregar misiones educativas.
* Agregar tutorial guiado.
* Agregar modo “aprendizaje”: explicar gluten, lactosa, sellos, vegano y sin TACC.

---

# Nota importante

NutriWorld no debe reemplazar la app principal. La app principal sigue siendo NutriLens: análisis de etiquetas, historial, chat y RAG.

NutriWorld es una interfaz alternativa e inmersiva para explorar esos datos de forma más visual, educativa e interactiva.
