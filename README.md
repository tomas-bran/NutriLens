# NutriLens

> App inteligente que analiza etiquetas alimentarias desde imágenes o PDFs, extrae información estructurada con IA multimodal, clasifica riesgos mediante reglas propias y permite consultar productos guardados usando recuperación de información (RAG).

Trabajo Práctico Integrador de la materia **Inteligencia Artificial Aplicada** — UNLaM.

---

## Tabla de contenidos

- [Resumen](#resumen)
- [Problema a resolver](#problema-a-resolver)
- [Usuarios objetivo](#usuarios-objetivo)
- [Alcance del MVP](#alcance-del-mvp)
- [Fuera del alcance del MVP](#fuera-del-alcance-del-mvp)
- [Funcionalidades principales](#funcionalidades-principales)
- [Arquitectura propuesta](#arquitectura-propuesta)
- [Pipeline del análisis](#pipeline-del-análisis)
- [Pantallas principales](#pantallas-principales)
- [Documentación](#documentación)
- [División del equipo](#división-del-equipo)
- [Roadmap](#roadmap)
- [Criterios de aceptación del MVP](#criterios-de-aceptación-del-mvp)

---

## Resumen

NutriLens permite al usuario subir una foto del producto, su etiqueta nutricional o lista de ingredientes (en imagen o PDF) y obtener a cambio:

- Información estructurada en JSON (ingredientes, alérgenos, sellos, categoría, datos nutricionales).
- Clasificación de aptitud (vegano, celíaco, sin lactosa).
- Cálculo de riesgo (bajo, medio o alto) mediante reglas propias.
- Una explicación simple en lenguaje claro.
- Un historial consultable mediante chat con RAG.

> **Aviso**: NutriLens **no reemplaza** a un profesional de nutrición ni garantiza seguridad médica absoluta. Funciona como un **asistente informativo** basado en la información visible de la etiqueta.

---

## Problema a resolver

Las etiquetas alimentarias suelen tener información técnica, extensa o difícil de interpretar rápidamente. Un usuario puede no saber si un producto contiene gluten, lactosa, ingredientes de origen animal, exceso de azúcar o componentes problemáticos para sus preferencias.

Ejemplos de casos reales:

- Una persona celíaca quiere saber si un producto parece compatible.
- Una persona con intolerancia a la lactosa quiere detectar ingredientes derivados de leche.
- Un consumidor quiere comparar galletitas y elegir la opción con mejor perfil nutricional.
- Un usuario quiere entender sellos o advertencias sin leer toda la etiqueta.

---

## Usuarios objetivo

| Tipo                          | Descripción                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| **Usuario general**           | Persona que quiere entender rápidamente una etiqueta alimentaria.                         |
| **Usuario con restricciones** | Persona que quiere identificar incompatibilidades (gluten, lactosa, animales, alérgenos). |
| **Usuario comparador**        | Persona que quiere consultar productos guardados para elegir entre opciones.              |

---

## Alcance del MVP

El MVP de NutriLens incluye:

1. Carga de imagen o PDF de etiqueta alimentaria.
2. Validación básica del archivo.
3. Extracción de datos mediante modelo de IA multimodal.
4. Normalización de salida en JSON.
5. Clasificación de alérgenos y restricciones.
6. Cálculo de riesgo mediante reglas propias.
7. Visualización clara del análisis.
8. Guardado del producto procesado.
9. Historial de productos analizados.
10. Chat simple para consultar productos guardados (RAG básico).

## Fuera del alcance del MVP

Estos puntos pueden considerarse como funcionalidades bonus para una versión final:

- Diagnóstico médico o nutricional.
- Recomendaciones clínicas personalizadas.
- Escaneo obligatorio de código de barras.
- Integración completa obligatoria con Open Food Facts.
- App móvil nativa.
- Registro avanzado de usuarios y planes nutricionales.
- Comparador complejo, audio generado, generación sintética de etiquetas.
- Base masiva de alimentos reales.

---

## Funcionalidades principales

### Carga de producto

El usuario puede subir foto del frente del producto, foto de ingredientes, foto de tabla nutricional o un PDF. La UI muestra estados claros: archivo cargado, procesando, análisis completado o error de archivo no soportado.

### Validación de entrada

Si la imagen o PDF no corresponde a una etiqueta alimentaria, el sistema responde con un error estructurado:

```json
{
  "error": "image_not_supported",
  "reason": "La imagen no parece corresponder a una etiqueta alimentaria."
}
```

### Extracción estructurada

La IA extrae información visible y la transforma en JSON. Ejemplo:

```json
{
  "producto": "Galletitas Choco Crunch",
  "categoria": "Galletitas dulces",
  "ingredientes_detectados": [
    "harina de trigo",
    "azúcar",
    "aceite vegetal",
    "cacao",
    "leche en polvo"
  ],
  "alergenos": ["gluten", "leche"],
  "sellos": ["exceso en azúcares", "exceso en grasas saturadas"],
  "apto_vegano": false,
  "apto_celiaco": false,
  "apto_sin_lactosa": false,
  "riesgo": "alto",
  "confidence": 0.94
}
```

### Clasificación de riesgo

El sistema asigna riesgo **bajo**, **medio** o **alto** mediante reglas propias:

- Si contiene gluten, no se considera apto celíaco.
- Si contiene leche, lactosa, suero o derivados lácteos, no se considera apto sin lactosa.
- Si contiene ingredientes de origen animal, no se considera vegano.
- Si tiene dos o más sellos, aumenta el riesgo.
- Si la confianza de extracción es baja, se muestra advertencia.

### Explicación simple

La app traduce la salida técnica a lenguaje claro:

> _"Este producto no es recomendable para personas con celiaquía o intolerancia a la lactosa. Se detectan gluten, leche y alto contenido de azúcar."_

### Historial

Cada análisis queda guardado con nombre, categoría, ingredientes, alérgenos, sellos, riesgo, fecha, imagen asociada y el JSON resultado.

### Chat con RAG

El usuario puede preguntar sobre productos ya cargados:

- _"Dame galletitas con mejor perfil nutricional."_
- _"Mostrame productos aptos para celíacos."_
- _"¿Qué productos escaneados tienen leche?"_
- _"Comparame estas dos opciones."_

El sistema recupera productos relevantes y genera una respuesta usando esos datos. Es una versión simple de **RAG** (Retrieval-Augmented Generation): buscar información guardada y usarla como contexto para que el modelo genere una respuesta fundamentada.

---

## Arquitectura propuesta

**Frontend** — Next.js + TypeScript. Componentes para upload, resultado, historial y chat.

**Backend** — API Routes de Next.js (o backend Node.js separado). Endpoints para analizar imagen/PDF, historial y chat/RAG.

**IA** — Modelo multimodal para analizar imagen/PDF + LLM (Large Language Model) para explicación y chat.

**Base de datos** — SQLite, PostgreSQL o archivo JSON para MVP. Tabla de productos analizados y tabla opcional de consultas realizadas.

**RAG MVP** — Búsqueda por filtros y palabras clave → envío de productos recuperados al modelo → generación de respuesta usando solo productos disponibles.

---

## Pipeline del análisis

1. **Ingesta de archivo** — recibe imagen o PDF.
2. **Validación** — verifica si parece una etiqueta alimentaria.
3. **OCR / lectura visual** — extrae texto visible.
4. **Parsing** — convierte texto desordenado en campos estructurados.
5. **Detección de alérgenos** — identifica gluten, leche, frutos secos u otros.
6. **Clasificación de aptitud** — evalúa vegano, celíaco y sin lactosa.
7. **Cálculo de riesgo** — aplica reglas propias.
8. **Generación de explicación** — redacta una salida simple.
9. **Persistencia** — guarda el producto.
10. **Consulta RAG** — permite preguntas futuras sobre productos guardados.

---

## Pantallas principales

1. **Inicio / Upload** — botón para subir imagen o PDF, instrucciones, ejemplos válidos, acceso al historial.
2. **Análisis procesado** — imagen, riesgo, aptitudes, sellos, ingredientes, alérgenos, explicación, JSON y pipeline del agente.
3. **Historial** — lista de productos con filtros por categoría, riesgo y alérgenos.
4. **Chat / RAG** — input de pregunta, productos recuperados, respuesta explicada.

Los wireframes detallados están en [`docs/wireframes`](./docs/wireframes).

---

## Documentación

| Sección                     | Ubicación                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| Guía para desarrolladores   | [`DEVELOPMENT.md`](./DEVELOPMENT.md)                                                                   |
| Documento funcional del MVP | [`docs/mvp/NutriLens-MVP-Documento-Funcional.pdf`](./docs/mvp/NutriLens-MVP-Documento-Funcional.pdf)   |
| Consigna del TP Integrador  | [`docs/mvp/Consigna-TP-Integrador-IA-Aplicada.pdf`](./docs/mvp/Consigna-TP-Integrador-IA-Aplicada.pdf) |
| Design system (screenshots) | [`docs/design-system`](./docs/design-system)                                                           |
| Wireframes desktop          | [`docs/wireframes/desktop`](./docs/wireframes/desktop)                                                 |
| Wireframes mobile           | [`docs/wireframes/mobile`](./docs/wireframes/mobile)                                                   |
| Archivo fuente Pencil       | [`docs/wireframes/NutriLens-Wireframes.pen`](./docs/wireframes/NutriLens-Wireframes.pen)               |

---

## División del equipo

| Persona   | Responsabilidad                                             |
| --------- | ----------------------------------------------------------- |
| Persona 1 | Frontend: upload, resultado, historial y UI general         |
| Persona 2 | Backend: endpoints, base de datos y persistencia            |
| Persona 3 | IA: prompts, schema JSON, extracción y explicación          |
| Persona 4 | RAG, datos mockeados, testing, documentación y presentación |

---

## Roadmap

**Semana 1**

- Definir schema JSON.
- Armar UI base.
- Implementar upload.
- Crear endpoint de análisis.
- Probar prompt con 5 productos.
- Guardar resultados en base.

**Semana 2**

- Agregar historial.
- Agregar chat/RAG básico.
- Cargar productos mockeados.
- Mejorar clasificación de riesgo.
- Pulir UI.
- Crear casos de prueba.
- Preparar presentación.

**Versión final / bonus**

- Integrar Open Food Facts.
- Agregar escaneo de código de barras.
- Búsqueda vectorial real.
- Comparador de productos.
- Audio resumen.
- Generación de etiqueta simplificada.

---

## Criterios de aceptación del MVP

- [ ] El usuario puede subir una imagen o PDF.
- [ ] El sistema devuelve un JSON estructurado.
- [ ] El sistema detecta al menos ingredientes, alérgenos y riesgo.
- [ ] La UI muestra el análisis de forma entendible.
- [ ] El sistema guarda el producto analizado.
- [ ] El historial muestra productos previos.
- [ ] El chat responde usando productos guardados.
- [ ] Si la imagen no es válida, devuelve error controlado.
- [ ] El sistema no afirma seguridad médica absoluta.

---

## Equipo

Trabajo Práctico Integrador — **Inteligencia Artificial Aplicada** — Prof. Damián Montefiori — UNLaM.
