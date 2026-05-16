#!/usr/bin/env python3
"""
Sube el backlog de NutriLens a Azure DevOps como work items.

Crea 6 Epics y 39 User Stories con:
- Title, Description (As a / I want / So that)
- Acceptance Criteria (Gherkin en HTML)
- Story Points (Fibonacci)
- Tags (mvp, epic:E0X, priority:P0|P1|P2)
- Parent link de cada Story a su Epic

REQUISITOS:
    - Python 3.8+ (sin dependencias externas, usa solo urllib stdlib)
    - Un Personal Access Token (PAT) de Azure DevOps con scope "Work Items: Read & Write"

USO:
    export AZURE_DEVOPS_PAT="tu_pat_aqui"
    python3 azure_devops_upload.py
    # opcional: --org, --project, --dry-run
    python3 azure_devops_upload.py --org tbranchesi --project NutriLens
    python3 azure_devops_upload.py --dry-run     # imprime sin crear nada
"""

import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


# ---------------------------------------------------------------------------
# Configuración por defecto
# ---------------------------------------------------------------------------
DEFAULT_ORG = "tbranchesi"
DEFAULT_PROJECT = "NutriLens"

API_VERSION = "7.0"


# ---------------------------------------------------------------------------
# Datos del backlog
# ---------------------------------------------------------------------------
EPICS = [
    {
        "id": "E01",
        "title": "Onboarding & Upload de etiquetas",
        "description": (
            "Permitir al usuario subir imagen o PDF de una etiqueta alimentaria "
            "y validar la entrada antes de procesarla. Cubre RF-01, RF-02, RF-03, RF-13."
        ),
    },
    {
        "id": "E02",
        "title": "Análisis multimodal y extracción estructurada",
        "description": (
            "Procesar el archivo con IA multimodal y devolver JSON validado contra schema. "
            "Cubre RF-04, RF-05, RF-06, RF-14 y RNF-05, RNF-06."
        ),
    },
    {
        "id": "E03",
        "title": "Clasificación, reglas y explicación",
        "description": (
            "Aplicar reglas propias sobre el JSON extraído para calcular aptitud "
            "(vegano/celíaco/sin lactosa), riesgo (bajo/medio/alto) y generar explicación. "
            "Cubre RF-07, RF-08, RF-09 y RNF-03, RNF-04."
        ),
    },
    {
        "id": "E04",
        "title": "Persistencia e historial",
        "description": (
            "Guardar cada análisis y exponerlo en un historial filtrable. "
            "Cubre RF-10, RF-11."
        ),
    },
    {
        "id": "E05",
        "title": "Chat con RAG sobre historial",
        "description": (
            "Permitir consultas en lenguaje natural sobre productos guardados con "
            "retrieval por filtros + generación con contexto. Cubre RF-12."
        ),
    },
    {
        "id": "E06",
        "title": "Pipeline observable y experiencia de uso",
        "description": (
            "Hacer visible el pipeline del agente, pulir UX (responsive, estados, design "
            "system) y tener datos mockeados para demo estable. Cubre RF-15 y RNF-01, RNF-02, RNF-07, RNF-08."
        ),
    },
]

# Cada story: (code, epic, points, priority, title, description_md, scenarios)
STORIES = [
    # ----------------- E01 -----------------
    {
        "code": "US-01", "epic": "E01", "points": 3, "priority": "P0",
        "title": "Subir imagen de etiqueta desde el dispositivo",
        "as_a": "usuario general",
        "i_want": "subir una foto de la etiqueta de un producto desde mi dispositivo",
        "so_that": "el sistema pueda analizarla y darme información estructurada",
        "scenarios": [
            ("Subida exitosa de imagen JPG/PNG", [
                "estoy en la pantalla de inicio",
                "selecciono una imagen JPG o PNG de menos de 10 MB",
                "el archivo se carga y aparece el estado 'Archivo cargado' y se habilita el botón 'Analizar producto'",
            ]),
            ("Formato no soportado", [
                "selecciono un archivo que no es imagen ni PDF (ej. .docx)",
                "intento cargarlo",
                "el sistema rechaza el archivo y muestra 'Formato no soportado. Subí una imagen (JPG/PNG) o un PDF.'",
            ]),
        ],
    },
    {
        "code": "US-02", "epic": "E01", "points": 2, "priority": "P0",
        "title": "Subir PDF de etiqueta",
        "as_a": "usuario general",
        "i_want": "subir un PDF con la información del producto",
        "so_that": "poder analizar fichas técnicas o etiquetas digitalizadas",
        "scenarios": [
            ("Subida exitosa de PDF", [
                "estoy en la pantalla de inicio",
                "subo un archivo PDF de menos de 10 MB",
                "el sistema lo acepta como entrada válida y muestra 'Archivo cargado'",
            ]),
            ("PDF dañado o ilegible", [
                "subí un PDF que no puede ser leído",
                "el sistema intenta procesarlo",
                "devuelve error estructurado con error='pdf_unreadable' y la UI muestra 'No pudimos leer el PDF. Intentá con otro archivo.'",
            ]),
        ],
    },
    {
        "code": "US-03", "epic": "E01", "points": 2, "priority": "P0",
        "title": "Validación de tipo y tamaño de archivo",
        "as_a": "sistema",
        "i_want": "validar el tipo MIME y el tamaño del archivo antes de procesarlo",
        "so_that": "evitar consumir recursos en archivos inválidos",
        "scenarios": [
            ("Tamaño máximo permitido", [
                "un archivo pesa más de 10 MB",
                "el usuario intenta subirlo",
                "el sistema lo rechaza antes de subirlo al backend y muestra 'El archivo supera el tamaño máximo de 10 MB.'",
            ]),
            ("MIME type válido", [
                "el archivo tiene MIME type image/jpeg, image/png o application/pdf",
                "el sistema lo valida",
                "lo acepta y pasa a la siguiente etapa del pipeline",
            ]),
        ],
    },
    {
        "code": "US-04", "epic": "E01", "points": 2, "priority": "P0",
        "title": "Estados visuales del flujo de upload",
        "as_a": "usuario",
        "i_want": "ver claramente en qué estado está mi archivo (cargado, procesando, completado, error)",
        "so_that": "saber qué está pasando en cada momento",
        "scenarios": [
            ("Estados visibles", [
                "subí un archivo válido",
                "el sistema procesa el flujo",
                "veo los estados 'Archivo cargado' → 'Procesando imagen' → 'Análisis completado' con indicador visual claro",
            ]),
            ("Error visible", [
                "ocurre un error en cualquier etapa",
                "el sistema lo detecta",
                "el flujo se interrumpe y se muestra un estado de error con mensaje legible y opción de reintentar",
            ]),
        ],
    },
    {
        "code": "US-05", "epic": "E01", "points": 5, "priority": "P0",
        "title": "Validar que el archivo corresponde a una etiqueta alimentaria",
        "as_a": "sistema",
        "i_want": "verificar que la imagen o PDF subido sea una etiqueta alimentaria",
        "so_that": "evitar análisis sobre imágenes irrelevantes",
        "scenarios": [
            ("Imagen no es etiqueta alimentaria", [
                "el usuario sube una foto de un paisaje o de una persona",
                "el sistema valida el contenido con el modelo",
                "devuelve {error: 'image_not_supported', reason: 'La imagen no parece corresponder a una etiqueta alimentaria.'} y la UI permite subir otro archivo",
            ]),
            ("Etiqueta válida", [
                "la imagen contiene una etiqueta alimentaria reconocible",
                "el sistema valida el contenido",
                "continúa con el pipeline de extracción",
            ]),
            ("Baja confianza de validación", [
                "el modelo no está seguro de si es etiqueta alimentaria",
                "la confianza está por debajo del umbral configurado",
                "el sistema avisa al usuario y le pide confirmación para continuar",
            ]),
        ],
    },
    {
        "code": "US-06", "epic": "E01", "points": 2, "priority": "P0",
        "title": "Pantalla de error con motivo claro",
        "as_a": "usuario",
        "i_want": "que cuando algo falla se me explique el motivo y qué puedo hacer",
        "so_that": "no quedarme bloqueado sin entender qué pasó",
        "scenarios": [
            ("Mensaje legible y accionable", [
                "el sistema devolvió un error estructurado",
                "la UI lo muestra",
                "veo un mensaje en lenguaje claro (no códigos técnicos) y un botón 'Probar con otro archivo' que me devuelve a upload",
            ]),
            ("Logging del error", [
                "un error fue mostrado al usuario",
                "el evento ocurre",
                "queda registrado en logs con tipo de error, momento y archivo (sin contenido sensible)",
            ]),
        ],
    },
    {
        "code": "US-07", "epic": "E01", "points": 3, "priority": "P1",
        "title": "Pantalla de inicio con instrucciones y ejemplos",
        "as_a": "usuario que ingresa por primera vez",
        "i_want": "ver una explicación corta de qué hace la app y ejemplos de imágenes válidas",
        "so_that": "subir el tipo correcto de archivo desde el principio",
        "scenarios": [
            ("Pantalla informativa", [
                "ingreso a NutriLens por primera vez",
                "se carga la pantalla de inicio",
                "veo título, descripción de una línea, botón de upload y bloque 'Cómo funciona' con 2-3 ejemplos válidos",
            ]),
            ("Acceso al historial", [
                "estoy en la pantalla de inicio",
                "ya tengo productos analizados previamente",
                "veo un acceso directo a 'Mi historial'",
            ]),
        ],
    },

    # ----------------- E02 -----------------
    {
        "code": "US-08", "epic": "E02", "points": 5, "priority": "P0",
        "title": "Endpoint backend para analizar un archivo",
        "as_a": "frontend",
        "i_want": "poder enviar un archivo a un endpoint /api/analyze y recibir el JSON estructurado",
        "so_that": "disparar el flujo de análisis desde la UI",
        "scenarios": [
            ("Endpoint expuesto", [
                "tengo un archivo válido",
                "envío POST /api/analyze con el archivo como multipart",
                "recibo 200 OK con el JSON estructurado o 4xx con error estructurado",
            ]),
            ("Respuesta en tiempo razonable", [
                "el archivo se envió correctamente",
                "el backend procesa la solicitud",
                "la respuesta llega en menos de 20 segundos para casos típicos",
            ]),
            ("Logging del análisis", [
                "se ejecutó un análisis",
                "termina el procesamiento",
                "queda registrado timestamp, duración, tipo de archivo y resultado (ok/error)",
            ]),
        ],
    },
    {
        "code": "US-09", "epic": "E02", "points": 5, "priority": "P0",
        "title": "Prompt + schema JSON consistente para extracción",
        "as_a": "desarrollador de IA",
        "i_want": "un prompt versionado y un schema JSON definido",
        "so_that": "la salida del modelo sea consistente y validable",
        "scenarios": [
            ("Schema definido", [
                "existe un schema en schemas/product.json",
                "el modelo devuelve una salida",
                "la salida cumple el schema (producto, categoria, ingredientes_detectados, alergenos, sellos, apto_*, riesgo, confidence)",
            ]),
            ("Salida inválida bloqueada", [
                "el modelo devuelve un JSON que no cumple schema",
                "el backend valida la salida",
                "rechaza la respuesta y aplica fallback (reintento correctivo o error controlado)",
            ]),
            ("Versionado del prompt", [
                "cambiamos el prompt",
                "ejecutamos un análisis",
                "queda registrada la versión del prompt utilizada para trazabilidad",
            ]),
        ],
    },
    {
        "code": "US-10", "epic": "E02", "points": 3, "priority": "P0",
        "title": "Extracción de ingredientes visibles",
        "as_a": "usuario",
        "i_want": "que el sistema extraiga la lista de ingredientes desde la etiqueta",
        "so_that": "ver qué contiene el producto sin leer la etiqueta entera",
        "scenarios": [
            ("Lista de ingredientes presente", [
                "la etiqueta muestra una lista de ingredientes legible",
                "el sistema procesa la imagen",
                "devuelve un array ingredientes_detectados con al menos los principales",
            ]),
            ("Ingredientes no legibles", [
                "la zona de ingredientes está borrosa o cortada",
                "el sistema procesa la imagen",
                "devuelve ingredientes_detectados=[] con confidence bajo y la UI advierte que puede ser incompleta",
            ]),
        ],
    },
    {
        "code": "US-11", "epic": "E02", "points": 5, "priority": "P0",
        "title": "Detección de alérgenos principales",
        "as_a": "usuario con restricciones",
        "i_want": "que el sistema identifique los alérgenos presentes (gluten, leche, frutos secos, soja, huevo, etc.)",
        "so_that": "decidir rápido si puedo consumir el producto",
        "scenarios": [
            ("Alérgenos clásicos detectados", [
                "el producto contiene 'harina de trigo' en los ingredientes",
                "el sistema procesa la etiqueta",
                "alergenos incluye 'gluten'",
            ]),
            ("Múltiples alérgenos", [
                "el producto contiene 'leche en polvo' y 'almendras'",
                "el sistema procesa la etiqueta",
                "alergenos incluye al menos 'leche' y 'frutos secos'",
            ]),
            ("Sin alérgenos detectados", [
                "ningún ingrediente coincide con la lista de alérgenos conocidos",
                "el sistema procesa la etiqueta",
                "alergenos es []",
            ]),
        ],
    },
    {
        "code": "US-12", "epic": "E02", "points": 3, "priority": "P0",
        "title": "Detección de sellos / advertencias visibles",
        "as_a": "usuario",
        "i_want": "que el sistema reconozca los sellos de advertencia (exceso en azúcares, grasas, sodio, etc.)",
        "so_that": "identificar productos críticos sin interpretar la imagen",
        "scenarios": [
            ("Sello presente en la etiqueta", [
                "la etiqueta tiene el sello 'Exceso en azúcares'",
                "el sistema procesa la imagen",
                "sellos incluye 'exceso en azúcares'",
            ]),
            ("Múltiples sellos", [
                "el producto tiene dos o más sellos visibles",
                "el sistema procesa la imagen",
                "todos los sellos quedan en el array sellos",
            ]),
        ],
    },
    {
        "code": "US-13", "epic": "E02", "points": 2, "priority": "P0",
        "title": "Detección de categoría del producto",
        "as_a": "sistema",
        "i_want": "clasificar el producto en una categoría (galletitas, lácteos, snacks, bebidas, etc.)",
        "so_that": "permitir filtros en el historial y consultas RAG por categoría",
        "scenarios": [
            ("Categoría conocida", [
                "el producto es claramente identificable",
                "el sistema procesa la etiqueta",
                "categoria toma uno de los valores definidos (galletitas, cereales, snacks, lácteos, bebidas, sin TACC, veganos, otros)",
            ]),
            ("Categoría desconocida", [
                "el producto no encaja en ninguna categoría conocida",
                "el sistema procesa la etiqueta",
                "categoria toma el valor 'otros'",
            ]),
        ],
    },
    {
        "code": "US-14", "epic": "E02", "points": 3, "priority": "P0",
        "title": "Confidence score y validación de schema",
        "as_a": "sistema",
        "i_want": "devolver un score de confianza junto con el JSON y validarlo contra schema",
        "so_that": "detectar análisis de baja calidad antes de mostrarlos al usuario",
        "scenarios": [
            ("Confidence presente", [
                "el modelo devolvió un análisis",
                "el backend valida la salida",
                "la respuesta incluye confidence como número entre 0 y 1",
            ]),
            ("Schema válido", [
                "el JSON pasó la validación de schema",
                "el backend lo devuelve al frontend",
                "el frontend puede confiar en la estructura sin null-checks defensivos",
            ]),
            ("Schema inválido → fallback", [
                "el modelo devolvió una salida que no cumple schema",
                "el backend la valida",
                "intenta un reintento correctivo y si vuelve a fallar devuelve error='extraction_invalid' con detalle",
            ]),
        ],
    },
    {
        "code": "US-15", "epic": "E02", "points": 3, "priority": "P1",
        "title": "Manejo de timeouts y errores del modelo",
        "as_a": "sistema",
        "i_want": "manejar caídas, timeouts o rate limits del proveedor de IA",
        "so_that": "la app no quede colgada y el usuario reciba un mensaje claro",
        "scenarios": [
            ("Timeout del modelo", [
                "el modelo tarda más del timeout configurado (ej. 30s)",
                "el backend detecta el timeout",
                "corta la llamada y devuelve error='model_timeout' y la UI ofrece reintentar",
            ]),
            ("Rate limit / error del proveedor", [
                "el proveedor devuelve 429 o 5xx",
                "el backend recibe la respuesta",
                "aplica backoff con un reintento adicional antes de devolver error y loguea el incidente",
            ]),
        ],
    },

    # ----------------- E03 -----------------
    {
        "code": "US-16", "epic": "E03", "points": 5, "priority": "P0",
        "title": "Reglas de aptitud (vegano / celíaco / sin lactosa)",
        "as_a": "sistema",
        "i_want": "evaluar la aptitud del producto contra reglas propias (vegano, celíaco, sin lactosa)",
        "so_that": "dar al usuario una clasificación accionable sin depender solo del modelo",
        "scenarios": [
            ("Producto con gluten → no apto celíaco", [
                "alergenos contiene 'gluten' o ingredientes incluyen trigo/cebada/centeno/avena no certificada",
                "se aplican las reglas",
                "apto_celiaco es false",
            ]),
            ("Producto con lácteos → no apto sin lactosa", [
                "ingredientes incluyen 'leche', 'lactosa', 'suero' o derivados lácteos",
                "se aplican las reglas",
                "apto_sin_lactosa es false",
            ]),
            ("Producto con origen animal → no apto vegano", [
                "ingredientes incluyen carne, leche, huevo, miel u otros derivados animales",
                "se aplican las reglas",
                "apto_vegano es false",
            ]),
            ("Reglas configurables", [
                "las reglas viven en un archivo de configuración versionado",
                "un dev agrega un nuevo ingrediente a la lista negra",
                "las reglas se aplican sin redeploy del modelo",
            ]),
        ],
    },
    {
        "code": "US-17", "epic": "E03", "points": 3, "priority": "P0",
        "title": "Cálculo de riesgo bajo / medio / alto",
        "as_a": "usuario",
        "i_want": "ver una clasificación general de riesgo del producto",
        "so_that": "decidir rápido sin tener que leer todos los detalles",
        "scenarios": [
            ("Producto con 2+ sellos → riesgo alto", [
                "el producto tiene 2 o más sellos de advertencia",
                "se calcula el riesgo",
                "riesgo es 'alto'",
            ]),
            ("Producto sin sellos ni alérgenos → riesgo bajo", [
                "el producto no tiene sellos y alergenos está vacío",
                "se calcula el riesgo",
                "riesgo es 'bajo'",
            ]),
            ("Producto con 1 sello o con alérgenos comunes → riesgo medio", [
                "el producto tiene exactamente 1 sello o tiene alérgenos pero sin sellos",
                "se calcula el riesgo",
                "riesgo es 'medio'",
            ]),
            ("Confianza baja → advertencia", [
                "el confidence está por debajo de 0.6",
                "se muestra el riesgo",
                "la UI agrega cartel 'Análisis con baja confianza, verificá manualmente'",
            ]),
        ],
    },
    {
        "code": "US-18", "epic": "E03", "points": 5, "priority": "P0",
        "title": "Generación de explicación en lenguaje simple",
        "as_a": "usuario",
        "i_want": "ver un resumen en lenguaje claro de por qué este producto tiene cierto riesgo",
        "so_that": "entender el resultado sin tener que interpretar JSON",
        "scenarios": [
            ("Explicación generada", [
                "el análisis terminó con riesgo alto y alérgenos detectados",
                "el sistema genera la explicación",
                "muestra un párrafo de 2-3 oraciones explicando los motivos",
            ]),
            ("Tono informativo, no médico", [
                "la explicación se genera",
                "se valida el texto",
                "no contiene 'consultá a un médico' ni afirmaciones absolutas y sí un disclaimer breve",
            ]),
        ],
    },
    {
        "code": "US-19", "epic": "E03", "points": 1, "priority": "P0",
        "title": "Disclaimer visible de 'no es consejo médico'",
        "as_a": "equipo",
        "i_want": "que cada resultado de análisis incluya un disclaimer visible",
        "so_that": "dejar claro que NutriLens es informativo y no reemplaza a un profesional",
        "scenarios": [
            ("Disclaimer en pantalla de resultado", [
                "el usuario ve un análisis procesado",
                "la UI renderiza la pantalla",
                "aparece 'NutriLens es un asistente informativo, no reemplaza el consejo de un profesional de nutrición.'",
            ]),
            ("Disclaimer en respuestas del chat", [
                "el chat genera una respuesta sobre productos guardados",
                "se renderiza",
                "la respuesta incluye o está acompañada del mismo disclaimer",
            ]),
        ],
    },
    {
        "code": "US-20", "epic": "E03", "points": 2, "priority": "P0",
        "title": "Advertencia automática si confianza es baja",
        "as_a": "usuario",
        "i_want": "que la app me avise cuando el análisis tiene baja confianza",
        "so_that": "no tomar decisiones basadas en datos poco confiables",
        "scenarios": [
            ("Confianza por debajo del umbral", [
                "confidence < 0.6",
                "se muestra el resultado",
                "se muestra badge 'Confianza baja' + sugerencia de subir nueva imagen",
            ]),
            ("Confianza alta", [
                "confidence ≥ 0.8",
                "se muestra el resultado",
                "no se muestra ninguna advertencia adicional",
            ]),
        ],
    },

    # ----------------- E04 -----------------
    {
        "code": "US-21", "epic": "E04", "points": 3, "priority": "P0",
        "title": "Modelo de datos del producto analizado",
        "as_a": "desarrollador backend",
        "i_want": "un modelo de datos definido para el producto analizado",
        "so_that": "la persistencia y las consultas sean predecibles",
        "scenarios": [
            ("Schema de tabla products definido", [
                "iniciamos la app",
                "se aplica la migración inicial",
                "existe la tabla products con id, nombre, categoria, ingredientes, alergenos, sellos, apto_*, riesgo, confidence, json_raw, imagen_path, created_at",
            ]),
            ("ID único", [
                "se guarda un producto",
                "se persiste",
                "se asigna un id único (UUID o autoincremental)",
            ]),
        ],
    },
    {
        "code": "US-22", "epic": "E04", "points": 3, "priority": "P0",
        "title": "Guardar análisis tras procesamiento exitoso",
        "as_a": "sistema",
        "i_want": "persistir cada análisis exitoso en la base",
        "so_that": "el usuario pueda consultarlo después y alimentar el chat RAG",
        "scenarios": [
            ("Persistencia automática", [
                "el análisis terminó sin errores y pasó la validación de schema",
                "el backend recibe el JSON validado",
                "crea un registro en products con todos los campos y guarda la imagen asociada",
            ]),
            ("Análisis con error no se persiste", [
                "el análisis falló o devolvió error estructurado",
                "el backend lo procesa",
                "no se crea registro en products y queda solo en logs",
            ]),
            ("Duplicado por imagen", [
                "el usuario sube la misma imagen dos veces",
                "el sistema detecta hash idéntico",
                "muestra el análisis previo en lugar de procesar otra vez",
            ]),
        ],
    },
    {
        "code": "US-23", "epic": "E04", "points": 3, "priority": "P0",
        "title": "Listar historial de productos analizados",
        "as_a": "usuario",
        "i_want": "ver una lista de los productos que ya analicé",
        "so_that": "consultarlos sin tener que volver a procesarlos",
        "scenarios": [
            ("Listado básico", [
                "tengo productos guardados",
                "ingreso a la pantalla 'Historial'",
                "veo lista con nombre, categoría, riesgo y fecha, ordenada por created_at descendente",
            ]),
            ("Paginación o scroll", [
                "tengo más de 20 productos guardados",
                "scrolleo la lista",
                "se cargan más resultados (paginación o infinite scroll)",
            ]),
            ("Endpoint del historial", [
                "la UI necesita la lista",
                "llama GET /api/products",
                "recibe un array con los campos mínimos para el listado (no el JSON completo)",
            ]),
        ],
    },
    {
        "code": "US-24", "epic": "E04", "points": 5, "priority": "P1",
        "title": "Filtros por categoría, riesgo y alérgenos",
        "as_a": "usuario",
        "i_want": "filtrar el historial por categoría, riesgo y alérgenos",
        "so_that": "encontrar rápidamente productos relevantes",
        "scenarios": [
            ("Filtro por categoría", [
                "estoy en el historial",
                "aplico el filtro 'categoría = galletitas'",
                "la lista muestra solo productos de esa categoría",
            ]),
            ("Filtro por riesgo", [
                "estoy en el historial",
                "aplico el filtro 'riesgo = alto'",
                "solo veo productos con riesgo alto",
            ]),
            ("Filtro por alérgeno", [
                "estoy en el historial",
                "aplico el filtro 'alérgeno = gluten'",
                "solo veo productos que contienen gluten en alergenos",
            ]),
            ("Combinación de filtros", [
                "aplico varios filtros simultáneamente",
                "se evalúan",
                "la lista cumple AND entre filtros",
            ]),
            ("Sin resultados", [
                "ningún producto cumple los filtros",
                "se aplica el filtro",
                "se muestra estado 'Sin resultados' con opción 'Limpiar filtros'",
            ]),
        ],
    },
    {
        "code": "US-25", "epic": "E04", "points": 3, "priority": "P0",
        "title": "Detalle de producto guardado",
        "as_a": "usuario",
        "i_want": "abrir el detalle de un producto del historial",
        "so_that": "ver toda la información extraída sin tener que reanalizarlo",
        "scenarios": [
            ("Vista de detalle completa", [
                "selecciono un producto del historial",
                "se abre la vista de detalle",
                "veo imagen, nombre, categoría, riesgo, aptitudes, alérgenos, sellos, ingredientes, explicación y JSON completo",
            ]),
            ("Endpoint de detalle", [
                "la UI necesita el detalle",
                "llama GET /api/products/:id",
                "recibe el producto completo (incluyendo json_raw)",
            ]),
            ("Producto no encontrado", [
                "el id no existe en la base",
                "la UI lo solicita",
                "recibe 404 con error estructurado y la UI muestra 'Producto no encontrado'",
            ]),
        ],
    },
    {
        "code": "US-26", "epic": "E04", "points": 1, "priority": "P0",
        "title": "Estado vacío del historial",
        "as_a": "usuario",
        "i_want": "entender qué hacer cuando todavía no tengo productos analizados",
        "so_that": "no quedarme mirando una pantalla vacía",
        "scenarios": [
            ("Historial vacío", [
                "no tengo productos guardados",
                "ingreso al historial",
                "veo ilustración + 'Todavía no analizaste ningún producto' + botón 'Analizar mi primer producto'",
            ]),
        ],
    },

    # ----------------- E05 -----------------
    {
        "code": "US-27", "epic": "E05", "points": 3, "priority": "P1",
        "title": "Interfaz de chat sobre historial",
        "as_a": "usuario",
        "i_want": "un chat donde escribir preguntas sobre los productos guardados",
        "so_that": "consultarlos en lenguaje natural sin armar filtros",
        "scenarios": [
            ("Chat operativo", [
                "ingreso a 'Chat'",
                "escribo una pregunta y presiono Enter",
                "veo el mensaje del usuario, indicador 'Pensando...' y luego la respuesta",
            ]),
            ("Persistencia en sesión", [
                "tengo una conversación en curso",
                "sigo escribiendo",
                "los mensajes previos se mantienen visibles en la sesión",
            ]),
            ("Reset de conversación", [
                "tengo una conversación en curso",
                "presiono 'Nueva conversación'",
                "se limpia el chat",
            ]),
        ],
    },
    {
        "code": "US-28", "epic": "E05", "points": 5, "priority": "P1",
        "title": "Retrieval por filtros y palabras clave sobre el historial",
        "as_a": "sistema",
        "i_want": "buscar en el historial los productos relevantes a la pregunta",
        "so_that": "usarlos como contexto al generar la respuesta (RAG)",
        "scenarios": [
            ("Pregunta con categoría explícita", [
                "el usuario pregunta 'mostrame galletitas aptas para celíacos'",
                "el sistema interpreta la intención",
                "recupera productos donde categoria=galletitas y apto_celiaco=true",
            ]),
            ("Pregunta con alérgeno", [
                "el usuario pregunta 'qué productos tengo con leche'",
                "el sistema interpreta la intención",
                "recupera productos donde alergenos contiene 'leche'",
            ]),
            ("Pregunta abierta", [
                "el usuario pregunta 'dame galletitas con mejor perfil nutricional'",
                "el sistema interpreta la intención",
                "recupera productos de categoría galletitas ordenados por menor riesgo y menos sellos",
            ]),
            ("Sin productos relevantes", [
                "el filtro no devuelve productos",
                "se ejecuta el retrieval",
                "devuelve array vacío al paso siguiente",
            ]),
        ],
    },
    {
        "code": "US-29", "epic": "E05", "points": 5, "priority": "P1",
        "title": "Generación de respuesta con contexto recuperado",
        "as_a": "sistema",
        "i_want": "enviar los productos recuperados al LLM como contexto y generar una respuesta fundamentada",
        "so_that": "la respuesta esté basada en datos reales del usuario y no en alucinaciones",
        "scenarios": [
            ("Respuesta basada en contexto", [
                "se recuperaron N productos relevantes",
                "el sistema invoca al LLM con la pregunta + productos como contexto",
                "la respuesta menciona productos del contexto y NO inventa productos fuera del contexto",
            ]),
            ("Disclaimer en la respuesta", [
                "el sistema genera una respuesta",
                "la muestra al usuario",
                "incluye disclaimer 'Basado en productos analizados por vos'",
            ]),
            ("Prompt versionado", [
                "el prompt de RAG vive en archivo de configuración",
                "se ejecuta una consulta",
                "queda registrada la versión del prompt para trazabilidad",
            ]),
        ],
    },
    {
        "code": "US-30", "epic": "E05", "points": 2, "priority": "P1",
        "title": "Caso sin productos relevantes en el historial",
        "as_a": "usuario",
        "i_want": "entender cuándo no tengo información suficiente",
        "so_that": "saber que necesito analizar más productos",
        "scenarios": [
            ("Retrieval vacío", [
                "el sistema no encontró productos relevantes",
                "se intenta responder",
                "muestra 'No tengo productos guardados que respondan...' y NO invoca al LLM",
            ]),
            ("Sugerencia accionable", [
                "la respuesta es vacía",
                "se muestra",
                "incluye botón 'Analizar nuevo producto' hacia upload",
            ]),
        ],
    },
    {
        "code": "US-31", "epic": "E05", "points": 5, "priority": "P2",
        "title": "Comparación entre dos productos",
        "as_a": "usuario",
        "i_want": "pedirle al chat que compare dos productos guardados",
        "so_that": "elegir cuál conviene más según mis criterios",
        "scenarios": [
            ("Comparación pedida explícitamente", [
                "escribo 'comparame Galletitas X con Galletitas Y'",
                "el sistema interpreta la intención",
                "recupera ambos productos y genera respuesta que contrasta ingredientes, alérgenos, sellos y riesgo",
            ]),
            ("Producto no existe en historial", [
                "uno de los productos mencionados no está guardado",
                "se intenta la comparación",
                "la respuesta indica qué producto falta y sugiere analizarlo",
            ]),
        ],
    },
    {
        "code": "US-32", "epic": "E05", "points": 3, "priority": "P1",
        "title": "Mostrar productos recuperados como contexto en la UI",
        "as_a": "usuario",
        "i_want": "ver qué productos del historial usó el sistema para responderme",
        "so_that": "confiar en la respuesta y poder profundizar en cada producto",
        "scenarios": [
            ("Lista de productos usados", [
                "el sistema generó una respuesta usando 3 productos",
                "la respuesta se muestra",
                "debajo aparecen 3 chips con nombre y riesgo de cada producto",
            ]),
            ("Click en chip → detalle", [
                "veo un chip de producto",
                "lo clickeo",
                "se abre la vista de detalle de ese producto",
            ]),
            ("Respuesta sin contexto", [
                "la respuesta no usó productos del historial",
                "se renderiza",
                "no se muestran chips (sección oculta)",
            ]),
        ],
    },

    # ----------------- E06 -----------------
    {
        "code": "US-33", "epic": "E06", "points": 5, "priority": "P1",
        "title": "Mostrar el pipeline del análisis en la UI",
        "as_a": "usuario",
        "i_want": "ver paso a paso cómo se procesó mi etiqueta",
        "so_that": "entender qué hace la app y confiar en el resultado",
        "scenarios": [
            ("Pipeline visible", [
                "el análisis terminó",
                "se renderiza la pantalla",
                "veo sección 'Pipeline del análisis' con los pasos (ingesta, validación, OCR, parsing, alérgenos, aptitud, riesgo, explicación, persistencia) con estado y duración",
            ]),
            ("Paso fallido", [
                "un paso del pipeline falló",
                "se renderiza",
                "ese paso aparece con icono de error y mensaje",
            ]),
        ],
    },
    {
        "code": "US-34", "epic": "E06", "points": 2, "priority": "P1",
        "title": "Ver JSON extraído colapsable",
        "as_a": "usuario técnico (o evaluador del TP)",
        "i_want": "ver el JSON crudo que generó la IA",
        "so_that": "validar la calidad de la extracción y la consistencia del schema",
        "scenarios": [
            ("Bloque colapsable", [
                "estoy en la pantalla de resultado",
                "abro la sección 'JSON extraído'",
                "veo JSON formateado con sintaxis resaltada y botón 'Copiar'",
            ]),
            ("Cerrado por defecto", [
                "entro a la pantalla",
                "se renderiza",
                "la sección JSON está colapsada",
            ]),
        ],
    },
    {
        "code": "US-35", "epic": "E06", "points": 2, "priority": "P0",
        "title": "Estados de carga y error consistentes",
        "as_a": "usuario",
        "i_want": "ver indicadores de carga claros y mensajes de error uniformes",
        "so_that": "la experiencia sea predecible",
        "scenarios": [
            ("Estado de carga global", [
                "cualquier acción dispara una request",
                "está en curso",
                "se muestra un indicador visual consistente (skeleton, spinner o barra)",
            ]),
            ("Errores uniformes", [
                "cualquier endpoint devuelve error",
                "la UI lo recibe",
                "se muestra componente <ErrorState> con icono + título + descripción + acción (reintentar o volver)",
            ]),
        ],
    },
    {
        "code": "US-36", "epic": "E06", "points": 5, "priority": "P1",
        "title": "App responsive (desktop + mobile)",
        "as_a": "usuario que usa la app desde el celular o la computadora",
        "i_want": "que la interfaz se adapte a la pantalla",
        "so_that": "sea usable en ambos contextos",
        "scenarios": [
            ("Layout mobile (<768px)", [
                "abro la app en un ancho menor a 768px",
                "se renderiza",
                "navegación bottom-bar/hamburguesa, tarjetas en una columna, CTA 'Tomar foto'",
            ]),
            ("Layout desktop (≥1024px)", [
                "abro la app en desktop",
                "se renderiza",
                "navegación sidebar/top-bar y historial en grilla de 2-3 columnas",
            ]),
            ("Wireframes como guía", [
                "los wireframes están en /docs/wireframes",
                "implementamos las pantallas",
                "respetan jerarquías y elementos definidos",
            ]),
        ],
    },
    {
        "code": "US-37", "epic": "E06", "points": 3, "priority": "P1",
        "title": "Aplicar design system definido",
        "as_a": "equipo",
        "i_want": "que toda la app use componentes y tokens del design system",
        "so_that": "dar coherencia visual y acelerar la implementación",
        "scenarios": [
            ("Tokens centralizados", [
                "existen archivos del design system (colores, tipografía, espaciado)",
                "implementamos un componente",
                "usa variables CSS/tokens, no colores/spacing hardcodeados",
            ]),
            ("Componentes reutilizables", [
                "necesitamos botones, cards, badges (aptitud, riesgo) y estados de upload",
                "los implementamos",
                "viven en /components/ui y se reutilizan en todas las pantallas",
            ]),
            ("Referencia en docs", [
                "un dev necesita ver el design system",
                "abre /docs/design-system",
                "ve las capturas de Header, DesignSystem y Components",
            ]),
        ],
    },
    {
        "code": "US-38", "epic": "E06", "points": 2, "priority": "P1",
        "title": "Dataset mockeado para demo estable",
        "as_a": "equipo",
        "i_want": "tener entre 20 y 40 productos precargados (mockeados)",
        "so_that": "la demo del TP sea estable y muestre todas las categorías",
        "scenarios": [
            ("Seed de productos", [
                "existe un script seed.ts con 20-40 productos",
                "se ejecuta 'npm run seed'",
                "los productos quedan persistidos con todos los campos completos",
            ]),
            ("Cobertura de categorías", [
                "ejecuté el seed",
                "consulto el historial",
                "veo al menos un producto por categoría definida",
            ]),
            ("Cobertura de riesgos", [
                "ejecuté el seed",
                "filtro por riesgo",
                "existen productos de riesgo bajo, medio y alto en cantidades razonables",
            ]),
        ],
    },
    {
        "code": "US-39", "epic": "E06", "points": 2, "priority": "P1",
        "title": "Tiempo de análisis razonable para la demo",
        "as_a": "equipo",
        "i_want": "que el análisis end-to-end tarde menos de un umbral aceptable",
        "so_that": "la presentación no se cuelgue",
        "scenarios": [
            ("Tiempo bajo umbral", [
                "se ejecuta un análisis sobre una imagen típica",
                "se mide el tiempo end-to-end",
                "termina en menos de 20 segundos en el 95% de los casos",
            ]),
            ("Fallback rápido", [
                "el modelo no responde rápido",
                "se supera el umbral configurado",
                "el sistema corta y muestra opción 'Reintentar'",
            ]),
        ],
    },
]


# ---------------------------------------------------------------------------
# Helpers HTTP / Azure DevOps
# ---------------------------------------------------------------------------
def auth_header(pat):
    return "Basic " + base64.b64encode(f":{pat}".encode()).decode()


def request(method, url, pat, body=None, content_type="application/json"):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", auth_header(pat))
    req.add_header("Accept", "application/json")
    if data is not None:
        req.add_header("Content-Type", content_type)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode("utf-8", errors="replace")
        try:
            body_json = json.loads(body_text)
        except Exception:
            body_json = body_text
        return e.code, body_json
    except urllib.error.URLError as e:
        return 0, str(e)


def detect_types(org, project, pat):
    """Detecta qué work item types están disponibles en el proyecto."""
    url = f"https://dev.azure.com/{org}/{project}/_apis/wit/workitemtypes?api-version={API_VERSION}"
    status, body = request("GET", url, pat)
    if status != 200:
        raise RuntimeError(f"No se pudieron listar work item types: {status} {body}")
    return {t["name"] for t in body.get("value", [])}


def pick_types(available):
    """Elige el tipo más apropiado para Epic y Story."""
    epic = "Epic" if "Epic" in available else None
    if "User Story" in available:
        story = "User Story"
    elif "Product Backlog Item" in available:
        story = "Product Backlog Item"
    elif "Issue" in available:
        story = "Issue"
    else:
        raise RuntimeError(f"No se encontró un tipo de story compatible. Disponibles: {available}")
    if epic is None:
        # Algunos templates (Basic) no tienen Epic; usamos el mismo tipo de story como contenedor.
        epic = story
    return epic, story


def html_description(as_a, i_want, so_that):
    return (
        f"<p><b>Como</b> {as_a},<br>"
        f"<b>quiero</b> {i_want},<br>"
        f"<b>para</b> {so_that}.</p>"
    )


def html_acceptance_criteria(scenarios):
    parts = []
    for i, (name, steps) in enumerate(scenarios, start=1):
        parts.append(f"<p><b>Escenario {i}: {name}</b></p>")
        parts.append("<ul>")
        verbs = ["Dado que", "Cuando", "Entonces"]
        for j, step in enumerate(steps):
            verb = verbs[j] if j < len(verbs) else "Y"
            parts.append(f"<li><b>{verb}</b> {step}</li>")
        parts.append("</ul>")
    return "".join(parts)


def make_patch(fields, parent_url=None):
    ops = [{"op": "add", "path": f"/fields/{k}", "value": v} for k, v in fields.items()]
    if parent_url:
        ops.append({
            "op": "add",
            "path": "/relations/-",
            "value": {
                "rel": "System.LinkTypes.Hierarchy-Reverse",
                "url": parent_url,
            },
        })
    return ops


def create_work_item(org, project, pat, wi_type, patch, dry_run=False):
    encoded_type = urllib.parse.quote(wi_type)
    url = (
        f"https://dev.azure.com/{org}/{project}/_apis/wit/workitems/"
        f"${encoded_type}?api-version={API_VERSION}"
    )
    if dry_run:
        print(f"[DRY RUN] POST {url}")
        for op in patch:
            print("        ", op)
        return 200, {"id": "DRY", "url": "DRY"}
    return request("POST", url, pat, patch, content_type="application/json-patch+json")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Sube backlog de NutriLens a Azure DevOps")
    parser.add_argument("--org", default=DEFAULT_ORG, help=f"Organization (default: {DEFAULT_ORG})")
    parser.add_argument("--project", default=DEFAULT_PROJECT, help=f"Project (default: {DEFAULT_PROJECT})")
    parser.add_argument("--dry-run", action="store_true", help="No crea nada, solo imprime")
    parser.add_argument("--story-only", action="store_true", help="Salta la creación de Epics (asume que ya existen)")
    args = parser.parse_args()

    pat = os.environ.get("AZURE_DEVOPS_PAT")
    if not pat and not args.dry_run:
        print("ERROR: la variable de entorno AZURE_DEVOPS_PAT no está seteada.", file=sys.stderr)
        print('       Ejemplo: export AZURE_DEVOPS_PAT="tu_pat"', file=sys.stderr)
        sys.exit(1)

    if not args.dry_run:
        print(f"Detectando work item types en {args.org}/{args.project}...")
        try:
            available = detect_types(args.org, args.project, pat)
        except RuntimeError as e:
            print(f"ERROR: {e}", file=sys.stderr)
            sys.exit(1)
        epic_type, story_type = pick_types(available)
        print(f"Tipos elegidos: epic='{epic_type}'  story='{story_type}'")
    else:
        epic_type, story_type = "Epic", "User Story"

    # 1) Crear Epics
    print(f"\n=== Creando {len(EPICS)} Epics ===")
    epic_url_by_id = {}
    for ep in EPICS:
        fields = {
            "System.Title": f"[{ep['id']}] {ep['title']}",
            "System.Description": f"<p>{ep['description']}</p>",
            "System.Tags": "mvp; nutrilens",
        }
        patch = make_patch(fields)
        status, body = create_work_item(args.org, args.project, pat, epic_type, patch, dry_run=args.dry_run)
        if status in (200, 201):
            wi_id = body.get("id")
            wi_url = body.get("url")
            epic_url_by_id[ep["id"]] = wi_url
            print(f"  OK  {ep['id']:>4}  id={wi_id}  '{ep['title']}'")
        else:
            print(f"  FAIL {ep['id']}: {status} {body}", file=sys.stderr)
            sys.exit(1)
        time.sleep(0.2)  # ser amable con rate limits

    # 2) Crear Stories
    print(f"\n=== Creando {len(STORIES)} User Stories ===")
    for st in STORIES:
        fields = {
            "System.Title": f"{st['code']} — {st['title']}",
            "System.Description": html_description(st["as_a"], st["i_want"], st["so_that"]),
            "Microsoft.VSTS.Common.AcceptanceCriteria": html_acceptance_criteria(st["scenarios"]),
            "Microsoft.VSTS.Scheduling.StoryPoints": st["points"],
            "System.Tags": f"mvp; epic:{st['epic']}; priority:{st['priority']}",
        }
        parent_url = epic_url_by_id.get(st["epic"]) if not args.dry_run else None
        patch = make_patch(fields, parent_url=parent_url)
        status, body = create_work_item(args.org, args.project, pat, story_type, patch, dry_run=args.dry_run)
        if status in (200, 201):
            wi_id = body.get("id")
            print(f"  OK  {st['code']:>6}  id={wi_id}  ({st['points']} SP, {st['priority']})  '{st['title']}'")
        else:
            print(f"  FAIL {st['code']}: {status} {body}", file=sys.stderr)
        time.sleep(0.2)

    print("\n=== Listo ===")
    if args.dry_run:
        print("Modo dry-run: no se creó nada en Azure DevOps.")


if __name__ == "__main__":
    main()
