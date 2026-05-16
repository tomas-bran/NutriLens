# Product Brief — NutriLens

> Documento base para el desglose del backlog. Sirve como input para épicas, user stories y futuros specs SDD.

---

## 1. Visión

**NutriLens es una app inteligente que analiza etiquetas alimentarias desde imágenes o PDFs, extrae información estructurada con IA multimodal, clasifica riesgos mediante reglas propias y permite consultar productos guardados usando recuperación de información (RAG).**

La propuesta resuelve un problema cotidiano: muchas personas no entienden rápidamente si un alimento es compatible con sus restricciones, preferencias o necesidades. NutriLens **no reemplaza** a un profesional de nutrición ni garantiza seguridad médica absoluta — funciona como un **asistente informativo** basado en la información visible de la etiqueta.

---

## 2. Usuarios objetivo

| Perfil | Necesidad principal | Caso de uso típico |
|--------|--------------------|-------------------|
| **Usuario general** | Entender rápidamente una etiqueta alimentaria | Saca foto a un producto y obtiene un resumen claro |
| **Usuario con restricciones alimentarias** | Identificar incompatibilidades (gluten, lactosa, alérgenos, origen animal) | Verifica si un producto es apto antes de comprarlo |
| **Usuario comparador** | Elegir entre opciones consultando productos ya guardados | Pregunta "dame galletitas con mejor perfil nutricional" |

---

## 3. Alcance del MVP

### Dentro del alcance (Must Have)

1. Carga de imagen o PDF de etiqueta alimentaria.
2. Validación básica del archivo (tipo, tamaño, parece etiqueta).
3. Extracción de datos mediante modelo de IA multimodal.
4. Normalización de salida en JSON con schema consistente.
5. Clasificación de alérgenos y aptitud (vegano, celíaco, sin lactosa).
6. Cálculo de riesgo (bajo/medio/alto) mediante reglas propias.
7. Visualización clara del análisis (resumen + JSON + pipeline).
8. Guardado del producto procesado.
9. Historial de productos analizados con filtros.
10. Chat simple con RAG para consultar productos guardados.

### Fuera del alcance del MVP (Bonus)

- Diagnóstico médico o nutricional / recomendaciones clínicas.
- Escaneo obligatorio de código de barras.
- Integración completa con Open Food Facts (queda opcional/futura).
- App móvil nativa.
- Registro avanzado de usuarios y planes nutricionales.
- Comparador complejo, audio resumen, generación sintética de etiquetas.
- Base masiva de alimentos reales / búsqueda vectorial real.

---

## 4. Criterios de aceptación del MVP

El MVP se considera entregable cuando:

- [ ] El usuario puede subir una imagen o PDF.
- [ ] El sistema devuelve un JSON estructurado validado contra schema.
- [ ] El sistema detecta al menos ingredientes, alérgenos y riesgo.
- [ ] La UI muestra el análisis de forma entendible.
- [ ] El sistema guarda el producto analizado.
- [ ] El historial muestra productos previos y permite filtrarlos.
- [ ] El chat responde usando exclusivamente productos guardados.
- [ ] Si la imagen no es válida, devuelve error estructurado con razón.
- [ ] El sistema nunca afirma seguridad médica absoluta (disclaimer visible).
- [ ] El pipeline interno del análisis es visible para el usuario.

---

## 5. Métricas de éxito

- Porcentaje de análisis completados correctamente sobre casos de prueba.
- Cantidad promedio de campos extraídos por producto.
- Precisión observada en detección de alérgenos sobre el dataset de prueba.
- Tiempo promedio de análisis end-to-end (objetivo: razonable para una demo).
- Cantidad de productos guardados.
- Cantidad de consultas RAG respondidas usando historial.
- Cantidad de errores controlados (no crashes).

---

## 6. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|-----------|
| Imagen borrosa o de baja calidad | Extracción incorrecta | Mostrar `confidence` y pedir nueva imagen si está por debajo de umbral |
| La IA inventa datos (hallucination) | Alto | Validar schema JSON estricto + aplicar reglas propias por encima del modelo |
| Producto no está en base externa | Medio | Permitir análisis 100% por imagen + base propia (sin dependencia de OFF) |
| Respuestas que parecen médicas | Alto | Disclaimers visibles, lenguaje informativo, nunca afirmar aptitud absoluta |
| Tiempo de desarrollo acotado | Alto | Recortar a flujo core: upload → JSON → riesgo → historial → chat simple |
| Etiqueta en otro idioma | Medio | Detección de idioma + fallback a inglés/español o mensaje claro |

---

## 7. Stack técnico propuesto

- **Frontend:** Next.js + TypeScript.
- **Backend:** API Routes de Next.js (o Node.js separado).
- **IA:** Modelo multimodal (visión + texto) + LLM para explicación/chat.
- **Base de datos:** SQLite, PostgreSQL o JSON local para MVP.
- **RAG:** Búsqueda por filtros y keywords sobre productos guardados + envío como contexto al LLM.

---

## 8. Equipo y responsabilidades

| Persona | Rol principal |
|---------|--------------|
| Persona 1 | Frontend: upload, resultado, historial y UI general |
| Persona 2 | Backend: endpoints, base de datos y persistencia |
| Persona 3 | IA: prompts, schema JSON, extracción y explicación |
| Persona 4 | RAG, datos mockeados, testing, documentación y presentación |
