/**
 * Prisma seed (US-38, E06 §8).
 *
 * Inserta 50 productos deterministas que cubren las 8 categorías y los 3
 * niveles de riesgo del modelo. IDs UUID hardcodeados para que los tests
 * E2E y manuales se puedan apoyar en ellos.
 *
 * Distribución (alineada con E06 §8.1, escalada de 25 → 50):
 *
 * | Categoría  | n  | alto | medio | bajo |
 * |------------|----|------|-------|------|
 * | galletitas |  9 |   3  |   4   |   2  |
 * | cereales   |  7 |   2  |   3   |   2  |
 * | snacks     |  7 |   3  |   2   |   2  |
 * | lacteos    |  6 |   2  |   2   |   2  |
 * | bebidas    |  6 |   2  |   2   |   2  |
 * | sin_tacc   |  6 |   0  |   2   |   4  |
 * | veganos    |  5 |   0  |   2   |   3  |
 * | otros      |  4 |   1  |   2   |   1  |
 * | total      | 50 |  13  |  19   |  18  |
 *
 * Comandos:
 *   npm run seed         # inserta (idempotente: borra los 50 IDs hardcodeados antes)
 *   npm run seed:reset   # `prisma migrate reset` + re-seed (destruye toda la DB)
 */
import { PrismaClient, type Categoria as PrismaCategoria, type Riesgo } from '@prisma/client';
import { ALERGENOS, SELLOS, type Alergeno, type Sello } from '../src/packages/schemas/product';

const prisma = new PrismaClient();

interface SeedProduct {
  id: string;
  nombre: string;
  categoria: PrismaCategoria;
  ingredientes: string[];
  alergenos: Alergeno[];
  sellos: Sello[];
  aptoVegano: boolean;
  aptoCeliaco: boolean;
  aptoSinLactosa: boolean;
  riesgo: Riesgo;
  confidence: number;
  reglasAplicadas: string[];
  explanation: string;
  /** Offset in minutes from "now" — older rows have higher values. */
  createdAtOffsetMin: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Categoría → label visible en español (espejo de CAT_PRISMA_TO_ZOD). */
const CATEGORIA_LABEL: Record<PrismaCategoria, string> = {
  galletitas: 'galletitas',
  cereales: 'cereales',
  snacks: 'snacks',
  lacteos: 'lácteos',
  bebidas: 'bebidas',
  sin_tacc: 'sin TACC',
  veganos: 'veganos',
  otros: 'otros',
};

/** Imagen placeholder por categoría — un JPEG mínimo commiteado por seed. */
const IMAGE_BY_CATEGORIA: Record<PrismaCategoria, string> = {
  galletitas: '/uploads/seed/galletitas.jpg',
  cereales: '/uploads/seed/cereales.jpg',
  snacks: '/uploads/seed/snacks.jpg',
  lacteos: '/uploads/seed/lacteos.jpg',
  bebidas: '/uploads/seed/bebidas.jpg',
  sin_tacc: '/uploads/seed/sin-tacc.jpg',
  veganos: '/uploads/seed/veganos.jpg',
  otros: '/uploads/seed/otros.jpg',
};

const PROMPT_VERSION = 'extract_product-v1';

/** UUID estable del formato 00000000-0000-0000-0000-000000000NNN. */
function id(n: number): string {
  const hex = n.toString().padStart(12, '0');
  return `00000000-0000-0000-0000-${hex}`;
}

/**
 * Reconstruye el JSON que el modelo habría devuelto antes de aplicar reglas.
 * Sirve para que la UI de "JSON extraído" (US-34) muestre algo plausible.
 */
function buildJsonRaw(p: SeedProduct): string {
  return JSON.stringify(
    {
      producto: p.nombre,
      categoria: CATEGORIA_LABEL[p.categoria],
      ingredientes_detectados: p.ingredientes,
      alergenos: p.alergenos,
      sellos: p.sellos,
      apto_vegano: p.aptoVegano,
      apto_celiaco: p.aptoCeliaco,
      apto_sin_lactosa: p.aptoSinLactosa,
      riesgo: p.riesgo,
      confidence: p.confidence,
    },
    null,
    2,
  );
}

/** Mini-trace coherente con E06 §2 — 5 steps, todos `ok`. */
function buildPipelineTrace(p: SeedProduct): string {
  return JSON.stringify([
    { name: 'validate_file', status: 'ok', durationMs: 12 },
    { name: 'detect_label_kind', status: 'ok', durationMs: 540 },
    { name: 'extract_with_ia', status: 'ok', durationMs: 1820 },
    { name: 'apply_rules', status: 'ok', durationMs: 4, meta: { rules: p.reglasAplicadas } },
    { name: 'compute_risk', status: 'ok', durationMs: 1, meta: { riesgo: p.riesgo } },
    { name: 'generate_explanation', status: 'ok', durationMs: 760 },
    { name: 'persist', status: 'ok', durationMs: 18 },
  ]);
}

// ---------------------------------------------------------------------------
// Dataset
// ---------------------------------------------------------------------------

const PRODUCTS: SeedProduct[] = [
  // ---------- galletitas (9: 3 alto / 4 medio / 2 bajo) ----------
  {
    id: id(1),
    nombre: 'Choco Crunch Galletitas',
    categoria: 'galletitas',
    ingredientes: ['harina de trigo', 'azúcar', 'cacao', 'aceite vegetal', 'leche entera en polvo'],
    alergenos: ['gluten', 'leche', 'soja'],
    sellos: ['exceso en azúcares', 'exceso en grasas saturadas', 'exceso en calorías'],
    aptoVegano: false,
    aptoCeliaco: false,
    aptoSinLactosa: false,
    riesgo: 'alto',
    confidence: 0.93,
    reglasAplicadas: ['contiene_gluten', 'contiene_lacteos', 'tres_sellos'],
    explanation:
      'Producto con gluten y lácteos, con 3 sellos de advertencia. No apto vegano ni celíaco.',
    createdAtOffsetMin: 5,
  },
  {
    id: id(2),
    nombre: 'Rellenas Vainilla Doble',
    categoria: 'galletitas',
    ingredientes: ['harina de trigo', 'azúcar', 'grasa vegetal', 'leche en polvo'],
    alergenos: ['gluten', 'leche'],
    sellos: ['exceso en azúcares', 'exceso en grasas totales'],
    aptoVegano: false,
    aptoCeliaco: false,
    aptoSinLactosa: false,
    riesgo: 'alto',
    confidence: 0.91,
    reglasAplicadas: ['contiene_gluten', 'contiene_lacteos'],
    explanation: 'Galletitas dulces con lácteos y gluten. Dos sellos por azúcares y grasas.',
    createdAtOffsetMin: 30,
  },
  {
    id: id(3),
    nombre: 'Surtido Champagne',
    categoria: 'galletitas',
    ingredientes: ['harina de trigo', 'azúcar', 'huevo', 'manteca'],
    alergenos: ['gluten', 'huevo', 'leche'],
    sellos: ['exceso en azúcares', 'exceso en grasas saturadas'],
    aptoVegano: false,
    aptoCeliaco: false,
    aptoSinLactosa: false,
    riesgo: 'alto',
    confidence: 0.88,
    reglasAplicadas: ['contiene_gluten', 'contiene_huevo', 'contiene_lacteos'],
    explanation: 'Mezcla con huevo, manteca y harina de trigo. Múltiples alérgenos.',
    createdAtOffsetMin: 120,
  },
  {
    id: id(4),
    nombre: 'Vainillas Clásicas',
    categoria: 'galletitas',
    ingredientes: ['harina de trigo', 'azúcar', 'huevo'],
    alergenos: ['gluten', 'huevo'],
    sellos: ['exceso en azúcares'],
    aptoVegano: false,
    aptoCeliaco: false,
    aptoSinLactosa: true,
    riesgo: 'medio',
    confidence: 0.9,
    reglasAplicadas: ['contiene_gluten', 'contiene_huevo'],
    explanation: 'Receta tradicional sin lácteos. Un sello por exceso de azúcares.',
    createdAtOffsetMin: 200,
  },
  {
    id: id(5),
    nombre: 'Crackers Salados',
    categoria: 'galletitas',
    ingredientes: ['harina de trigo', 'aceite de girasol', 'sal'],
    alergenos: ['gluten'],
    sellos: ['exceso en sodio'],
    aptoVegano: true,
    aptoCeliaco: false,
    aptoSinLactosa: true,
    riesgo: 'medio',
    confidence: 0.94,
    reglasAplicadas: ['contiene_gluten'],
    explanation: 'Crackers vegan-friendly pero con gluten y exceso de sodio.',
    createdAtOffsetMin: 240,
  },
  {
    id: id(6),
    nombre: 'Galletitas Limón',
    categoria: 'galletitas',
    ingredientes: ['harina de trigo', 'azúcar', 'jugo de limón', 'aceite vegetal'],
    alergenos: ['gluten'],
    sellos: ['exceso en azúcares'],
    aptoVegano: true,
    aptoCeliaco: false,
    aptoSinLactosa: true,
    riesgo: 'medio',
    confidence: 0.89,
    reglasAplicadas: ['contiene_gluten'],
    explanation: 'Sabor cítrico, sin lácteos ni huevo. Apto vegano.',
    createdAtOffsetMin: 280,
  },
  {
    id: id(7),
    nombre: 'Galletas Maicena',
    categoria: 'galletitas',
    ingredientes: ['fécula de maíz', 'azúcar', 'manteca', 'huevo'],
    alergenos: ['leche', 'huevo'],
    sellos: ['exceso en azúcares'],
    aptoVegano: false,
    aptoCeliaco: true,
    aptoSinLactosa: false,
    riesgo: 'medio',
    confidence: 0.87,
    reglasAplicadas: ['contiene_huevo', 'contiene_lacteos'],
    explanation: 'Sin gluten (maicena) pero con manteca y huevo. Apto celíaco.',
    createdAtOffsetMin: 320,
  },
  {
    id: id(8),
    nombre: 'Galletitas Avena Integral',
    categoria: 'galletitas',
    ingredientes: ['avena', 'harina integral de trigo', 'azúcar mascabo', 'aceite de girasol'],
    alergenos: ['gluten'],
    sellos: [],
    aptoVegano: true,
    aptoCeliaco: false,
    aptoSinLactosa: true,
    riesgo: 'bajo',
    confidence: 0.92,
    reglasAplicadas: ['contiene_gluten'],
    explanation: 'Sin sellos de advertencia. Apto vegano por no contener lácteos ni huevo.',
    createdAtOffsetMin: 400,
  },
  {
    id: id(9),
    nombre: 'Galletitas Arroz Inflado',
    categoria: 'galletitas',
    ingredientes: ['harina de arroz', 'aceite vegetal'],
    alergenos: [],
    sellos: [],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'bajo',
    confidence: 0.9,
    reglasAplicadas: [],
    explanation: 'Producto simple, sin alérgenos ni sellos. Apto todas las dietas.',
    createdAtOffsetMin: 480,
  },

  // ---------- cereales (7: 2 alto / 3 medio / 2 bajo) ----------
  {
    id: id(10),
    nombre: 'Choco Balls Cereal',
    categoria: 'cereales',
    ingredientes: ['harina de maíz', 'azúcar', 'cacao', 'jarabe de glucosa'],
    alergenos: ['gluten', 'soja'],
    sellos: ['exceso en azúcares', 'exceso en grasas totales'],
    aptoVegano: true,
    aptoCeliaco: false,
    aptoSinLactosa: true,
    riesgo: 'alto',
    confidence: 0.91,
    reglasAplicadas: ['contiene_gluten', 'multiples_sellos'],
    explanation: 'Cereal infantil con dos sellos de exceso.',
    createdAtOffsetMin: 60,
  },
  {
    id: id(11),
    nombre: 'Cereal Frutado Azucarado',
    categoria: 'cereales',
    ingredientes: ['maíz', 'azúcar', 'extracto de frutas', 'colorantes'],
    alergenos: ['gluten'],
    sellos: ['exceso en azúcares'],
    aptoVegano: true,
    aptoCeliaco: false,
    aptoSinLactosa: true,
    riesgo: 'alto',
    confidence: 0.86,
    reglasAplicadas: ['contiene_gluten'],
    explanation: 'Alto contenido de azúcares agregados.',
    createdAtOffsetMin: 150,
  },
  {
    id: id(12),
    nombre: 'Granola Tradicional',
    categoria: 'cereales',
    ingredientes: ['avena', 'miel', 'frutos secos', 'pasas'],
    alergenos: ['gluten', 'frutos secos'],
    sellos: ['exceso en azúcares'],
    aptoVegano: false,
    aptoCeliaco: false,
    aptoSinLactosa: true,
    riesgo: 'medio',
    confidence: 0.93,
    reglasAplicadas: ['contiene_gluten', 'contiene_frutos_secos'],
    explanation: 'Granola con miel (no apto vegano) y frutos secos.',
    createdAtOffsetMin: 220,
  },
  {
    id: id(13),
    nombre: 'Copos de Maíz Clásicos',
    categoria: 'cereales',
    ingredientes: ['maíz', 'azúcar', 'sal', 'malta de cebada'],
    alergenos: ['gluten'],
    sellos: ['exceso en sodio'],
    aptoVegano: true,
    aptoCeliaco: false,
    aptoSinLactosa: true,
    riesgo: 'medio',
    confidence: 0.95,
    reglasAplicadas: ['contiene_gluten'],
    explanation: 'Clásico con malta de cebada — tiene gluten.',
    createdAtOffsetMin: 260,
  },
  {
    id: id(14),
    nombre: 'Avena en Hojuelas',
    categoria: 'cereales',
    ingredientes: ['avena 100%'],
    alergenos: ['gluten'],
    sellos: [],
    aptoVegano: true,
    aptoCeliaco: false,
    aptoSinLactosa: true,
    riesgo: 'medio',
    confidence: 0.94,
    reglasAplicadas: ['contiene_gluten'],
    explanation: 'Avena pura. Atención: contiene gluten por contaminación cruzada habitual.',
    createdAtOffsetMin: 350,
  },
  {
    id: id(15),
    nombre: 'Granola Sin Azúcar',
    categoria: 'cereales',
    ingredientes: ['avena', 'almendras', 'semillas de chía', 'coco rallado'],
    alergenos: ['gluten', 'frutos secos'],
    sellos: [],
    aptoVegano: true,
    aptoCeliaco: false,
    aptoSinLactosa: true,
    riesgo: 'bajo',
    confidence: 0.92,
    reglasAplicadas: ['contiene_gluten', 'contiene_frutos_secos'],
    explanation: 'Sin sellos de exceso. Buena opción si tolera gluten.',
    createdAtOffsetMin: 420,
  },
  {
    id: id(16),
    nombre: 'Quinoa Inflada',
    categoria: 'cereales',
    ingredientes: ['quinoa'],
    alergenos: [],
    sellos: [],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'bajo',
    confidence: 0.96,
    reglasAplicadas: [],
    explanation: 'Cereal puro sin alérgenos ni sellos. Apto todas las dietas.',
    createdAtOffsetMin: 500,
  },

  // ---------- snacks (7: 3 alto / 2 medio / 2 bajo) ----------
  {
    id: id(17),
    nombre: 'Papas Fritas Saladas',
    categoria: 'snacks',
    ingredientes: ['papa', 'aceite de girasol', 'sal'],
    alergenos: [],
    sellos: ['exceso en sodio', 'exceso en grasas totales', 'exceso en grasas saturadas'],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'alto',
    confidence: 0.94,
    reglasAplicadas: ['multiples_sellos'],
    explanation: 'Tres sellos por exceso de sodio y grasas. Apto dietas, no salud.',
    createdAtOffsetMin: 25,
  },
  {
    id: id(18),
    nombre: 'Nachos de Maíz Cheddar',
    categoria: 'snacks',
    ingredientes: ['maíz', 'aceite vegetal', 'queso cheddar en polvo', 'sal'],
    alergenos: ['leche'],
    sellos: ['exceso en sodio', 'exceso en grasas saturadas'],
    aptoVegano: false,
    aptoCeliaco: true,
    aptoSinLactosa: false,
    riesgo: 'alto',
    confidence: 0.89,
    reglasAplicadas: ['contiene_lacteos'],
    explanation: 'Snack con lácteos y dos sellos por sodio y grasas saturadas.',
    createdAtOffsetMin: 70,
  },
  {
    id: id(19),
    nombre: 'Palitos Salados',
    categoria: 'snacks',
    ingredientes: ['harina de trigo', 'aceite vegetal', 'sal'],
    alergenos: ['gluten'],
    sellos: ['exceso en sodio'],
    aptoVegano: true,
    aptoCeliaco: false,
    aptoSinLactosa: true,
    riesgo: 'alto',
    confidence: 0.87,
    reglasAplicadas: ['contiene_gluten'],
    explanation: 'Exceso de sodio y gluten.',
    createdAtOffsetMin: 110,
  },
  {
    id: id(20),
    nombre: 'Tostadas de Arroz',
    categoria: 'snacks',
    ingredientes: ['arroz integral', 'sal'],
    alergenos: [],
    sellos: ['exceso en sodio'],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'medio',
    confidence: 0.93,
    reglasAplicadas: [],
    explanation: 'Apto celíaco y vegano. Un sello por exceso de sodio.',
    createdAtOffsetMin: 180,
  },
  {
    id: id(21),
    nombre: 'Mix de Frutos Secos',
    categoria: 'snacks',
    ingredientes: ['almendras', 'nueces', 'pasas', 'maní'],
    alergenos: ['frutos secos', 'maní'],
    sellos: [],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'medio',
    confidence: 0.95,
    reglasAplicadas: ['contiene_frutos_secos', 'contiene_mani'],
    explanation: 'Sin sellos, pero alérgeno fuerte para sensibles a frutos secos.',
    createdAtOffsetMin: 230,
  },
  {
    id: id(22),
    nombre: 'Garbanzos Tostados',
    categoria: 'snacks',
    ingredientes: ['garbanzo', 'aceite de oliva', 'pimentón'],
    alergenos: [],
    sellos: [],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'bajo',
    confidence: 0.91,
    reglasAplicadas: [],
    explanation: 'Snack apto todas las dietas, sin sellos.',
    createdAtOffsetMin: 380,
  },
  {
    id: id(23),
    nombre: 'Chips de Batata Horneadas',
    categoria: 'snacks',
    ingredientes: ['batata', 'aceite de oliva', 'pimienta'],
    alergenos: [],
    sellos: [],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'bajo',
    confidence: 0.88,
    reglasAplicadas: [],
    explanation: 'Versión horneada sin sodio agregado.',
    createdAtOffsetMin: 440,
  },

  // ---------- lacteos (6: 2 alto / 2 medio / 2 bajo) ----------
  {
    id: id(24),
    nombre: 'Yogur Bebible Sabor Frutilla',
    categoria: 'lacteos',
    ingredientes: ['leche', 'azúcar', 'jarabe de frutilla', 'colorante'],
    alergenos: ['leche'],
    sellos: ['exceso en azúcares', 'exceso en calorías'],
    aptoVegano: false,
    aptoCeliaco: true,
    aptoSinLactosa: false,
    riesgo: 'alto',
    confidence: 0.92,
    reglasAplicadas: ['contiene_lacteos'],
    explanation: 'Yogur saborizado con azúcar agregada. Dos sellos.',
    createdAtOffsetMin: 40,
  },
  {
    id: id(25),
    nombre: 'Postre Lácteo Chocolate',
    categoria: 'lacteos',
    ingredientes: ['leche', 'crema', 'azúcar', 'cacao'],
    alergenos: ['leche'],
    sellos: ['exceso en azúcares', 'exceso en grasas saturadas'],
    aptoVegano: false,
    aptoCeliaco: true,
    aptoSinLactosa: false,
    riesgo: 'alto',
    confidence: 0.9,
    reglasAplicadas: ['contiene_lacteos'],
    explanation: 'Postre con crema y azúcar. Dos sellos.',
    createdAtOffsetMin: 90,
  },
  {
    id: id(26),
    nombre: 'Queso Untable Clásico',
    categoria: 'lacteos',
    ingredientes: ['leche', 'crema', 'sal', 'cuajo'],
    alergenos: ['leche'],
    sellos: ['exceso en grasas saturadas'],
    aptoVegano: false,
    aptoCeliaco: true,
    aptoSinLactosa: false,
    riesgo: 'medio',
    confidence: 0.94,
    reglasAplicadas: ['contiene_lacteos'],
    explanation: 'Queso untable con un sello por grasas saturadas.',
    createdAtOffsetMin: 170,
  },
  {
    id: id(27),
    nombre: 'Leche Entera Larga Vida',
    categoria: 'lacteos',
    ingredientes: ['leche entera', 'vitamina A', 'vitamina D'],
    alergenos: ['leche'],
    sellos: ['exceso en grasas saturadas'],
    aptoVegano: false,
    aptoCeliaco: true,
    aptoSinLactosa: false,
    riesgo: 'medio',
    confidence: 0.96,
    reglasAplicadas: ['contiene_lacteos'],
    explanation: 'Leche entera con vitaminas. Un sello por grasas saturadas.',
    createdAtOffsetMin: 210,
  },
  {
    id: id(28),
    nombre: 'Yogur Natural Sin Azúcar',
    categoria: 'lacteos',
    ingredientes: ['leche descremada', 'fermentos lácticos'],
    alergenos: ['leche'],
    sellos: [],
    aptoVegano: false,
    aptoCeliaco: true,
    aptoSinLactosa: false,
    riesgo: 'bajo',
    confidence: 0.95,
    reglasAplicadas: ['contiene_lacteos'],
    explanation: 'Yogur sin sellos. Apto celíaco.',
    createdAtOffsetMin: 360,
  },
  {
    id: id(29),
    nombre: 'Leche Sin Lactosa',
    categoria: 'lacteos',
    ingredientes: ['leche deslactosada'],
    alergenos: ['leche'],
    sellos: [],
    aptoVegano: false,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'bajo',
    confidence: 0.93,
    reglasAplicadas: ['contiene_lacteos'],
    explanation: 'Sin lactosa pero con proteínas lácteas.',
    createdAtOffsetMin: 410,
  },

  // ---------- bebidas (6: 2 alto / 2 medio / 2 bajo) ----------
  {
    id: id(30),
    nombre: 'Gaseosa Cola Regular',
    categoria: 'bebidas',
    ingredientes: ['agua', 'azúcar', 'colorante caramelo', 'cafeína', 'ácido fosfórico'],
    alergenos: [],
    sellos: ['exceso en azúcares', 'exceso en calorías'],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'alto',
    confidence: 0.96,
    reglasAplicadas: ['multiples_sellos'],
    explanation: 'Bebida azucarada con dos sellos.',
    createdAtOffsetMin: 55,
  },
  {
    id: id(31),
    nombre: 'Jugo Naranja con Azúcar',
    categoria: 'bebidas',
    ingredientes: ['agua', 'jugo de naranja', 'azúcar', 'conservantes'],
    alergenos: ['sulfitos'],
    sellos: ['exceso en azúcares'],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'alto',
    confidence: 0.88,
    reglasAplicadas: [],
    explanation: 'Jugo azucarado con sulfitos.',
    createdAtOffsetMin: 130,
  },
  {
    id: id(32),
    nombre: 'Bebida Isotónica',
    categoria: 'bebidas',
    ingredientes: ['agua', 'azúcar', 'minerales', 'colorante'],
    alergenos: [],
    sellos: ['exceso en sodio'],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'medio',
    confidence: 0.9,
    reglasAplicadas: [],
    explanation: 'Bebida para deporte con un sello por sodio.',
    createdAtOffsetMin: 190,
  },
  {
    id: id(33),
    nombre: 'Té Helado Limón',
    categoria: 'bebidas',
    ingredientes: ['agua', 'azúcar', 'extracto de té', 'aroma a limón'],
    alergenos: [],
    sellos: ['exceso en azúcares'],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'medio',
    confidence: 0.89,
    reglasAplicadas: [],
    explanation: 'Té dulce con un sello por azúcares.',
    createdAtOffsetMin: 250,
  },
  {
    id: id(34),
    nombre: 'Agua Mineral',
    categoria: 'bebidas',
    ingredientes: ['agua mineral'],
    alergenos: [],
    sellos: [],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'bajo',
    confidence: 0.99,
    reglasAplicadas: [],
    explanation: 'Sin sellos, apto todas las dietas.',
    createdAtOffsetMin: 480,
  },
  {
    id: id(35),
    nombre: 'Soda Saborizada Zero',
    categoria: 'bebidas',
    ingredientes: ['agua', 'edulcorantes (sucralosa)', 'aroma natural'],
    alergenos: [],
    sellos: [],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'bajo',
    confidence: 0.92,
    reglasAplicadas: [],
    explanation: 'Sin azúcares ni sellos. Apto todas las dietas.',
    createdAtOffsetMin: 540,
  },

  // ---------- sin_tacc (6: 0 alto / 2 medio / 4 bajo) ----------
  {
    id: id(36),
    nombre: 'Galletitas Sin TACC Choco',
    categoria: 'sin_tacc',
    ingredientes: ['harina de arroz', 'fécula de mandioca', 'azúcar', 'cacao'],
    alergenos: [],
    sellos: ['exceso en azúcares'],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'medio',
    confidence: 0.91,
    reglasAplicadas: [],
    explanation: 'Apto celíaco con un sello por azúcares.',
    createdAtOffsetMin: 290,
  },
  {
    id: id(37),
    nombre: 'Pan Lactal Sin Gluten',
    categoria: 'sin_tacc',
    ingredientes: ['harina de arroz', 'almidón de maíz', 'huevo', 'aceite'],
    alergenos: ['huevo'],
    sellos: ['exceso en sodio'],
    aptoVegano: false,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'medio',
    confidence: 0.89,
    reglasAplicadas: ['contiene_huevo'],
    explanation: 'Pan sin gluten pero con huevo. Sello por sodio.',
    createdAtOffsetMin: 330,
  },
  {
    id: id(38),
    nombre: 'Harina de Almendras',
    categoria: 'sin_tacc',
    ingredientes: ['almendras molidas'],
    alergenos: ['frutos secos'],
    sellos: [],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'bajo',
    confidence: 0.94,
    reglasAplicadas: ['contiene_frutos_secos'],
    explanation: 'Sin sellos. Atención por alérgeno (almendras).',
    createdAtOffsetMin: 400,
  },
  {
    id: id(39),
    nombre: 'Premezcla Sin TACC',
    categoria: 'sin_tacc',
    ingredientes: ['harina de arroz', 'almidón de mandioca', 'goma xántica'],
    alergenos: [],
    sellos: [],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'bajo',
    confidence: 0.93,
    reglasAplicadas: [],
    explanation: 'Premezcla básica apta todas las dietas.',
    createdAtOffsetMin: 460,
  },
  {
    id: id(40),
    nombre: 'Fideos de Arroz',
    categoria: 'sin_tacc',
    ingredientes: ['harina de arroz', 'agua', 'sal'],
    alergenos: [],
    sellos: [],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'bajo',
    confidence: 0.95,
    reglasAplicadas: [],
    explanation: 'Fideos aptos celíaco y vegano.',
    createdAtOffsetMin: 520,
  },
  {
    id: id(41),
    nombre: 'Polenta Instantánea',
    categoria: 'sin_tacc',
    ingredientes: ['sémola de maíz'],
    alergenos: [],
    sellos: [],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'bajo',
    confidence: 0.96,
    reglasAplicadas: [],
    explanation: 'Producto simple sin sellos.',
    createdAtOffsetMin: 600,
  },

  // ---------- veganos (5: 0 alto / 2 medio / 3 bajo) ----------
  {
    id: id(42),
    nombre: 'Hamburguesa Vegana Soja',
    categoria: 'veganos',
    ingredientes: ['proteína de soja', 'aceite vegetal', 'especias', 'sal'],
    alergenos: ['soja'],
    sellos: ['exceso en sodio'],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'medio',
    confidence: 0.9,
    reglasAplicadas: ['contiene_soja'],
    explanation: 'Hamburguesa vegana con sello por sodio.',
    createdAtOffsetMin: 95,
  },
  {
    id: id(43),
    nombre: 'Milanesas de Soja',
    categoria: 'veganos',
    ingredientes: ['proteína de soja', 'pan rallado', 'aceite'],
    alergenos: ['gluten', 'soja'],
    sellos: ['exceso en grasas totales'],
    aptoVegano: true,
    aptoCeliaco: false,
    aptoSinLactosa: true,
    riesgo: 'medio',
    confidence: 0.87,
    reglasAplicadas: ['contiene_gluten', 'contiene_soja'],
    explanation: 'Tiene gluten por el pan rallado. Sello por grasas.',
    createdAtOffsetMin: 165,
  },
  {
    id: id(44),
    nombre: 'Leche de Almendras',
    categoria: 'veganos',
    ingredientes: ['agua', 'almendras', 'sal'],
    alergenos: ['frutos secos'],
    sellos: [],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'bajo',
    confidence: 0.93,
    reglasAplicadas: ['contiene_frutos_secos'],
    explanation: 'Bebida vegetal apta vegano y celíaco.',
    createdAtOffsetMin: 280,
  },
  {
    id: id(45),
    nombre: 'Tofu Natural',
    categoria: 'veganos',
    ingredientes: ['poroto de soja', 'agua', 'nigari'],
    alergenos: ['soja'],
    sellos: [],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'bajo',
    confidence: 0.95,
    reglasAplicadas: ['contiene_soja'],
    explanation: 'Tofu fresco sin sellos. Apto todas las dietas (con soja).',
    createdAtOffsetMin: 370,
  },
  {
    id: id(46),
    nombre: 'Garbanzos en Conserva',
    categoria: 'veganos',
    ingredientes: ['garbanzos', 'agua', 'sal'],
    alergenos: [],
    sellos: [],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'bajo',
    confidence: 0.94,
    reglasAplicadas: [],
    explanation: 'Legumbre lista para usar, sin alérgenos ni sellos.',
    createdAtOffsetMin: 450,
  },

  // ---------- otros (4: 1 alto / 2 medio / 1 bajo) ----------
  {
    id: id(47),
    nombre: 'Salsa Pesto Industrial',
    categoria: 'otros',
    ingredientes: ['aceite', 'albahaca', 'queso', 'piñones', 'ajo'],
    alergenos: ['leche', 'frutos secos'],
    sellos: ['exceso en sodio', 'exceso en grasas saturadas'],
    aptoVegano: false,
    aptoCeliaco: true,
    aptoSinLactosa: false,
    riesgo: 'alto',
    confidence: 0.86,
    reglasAplicadas: ['contiene_lacteos', 'contiene_frutos_secos'],
    explanation: 'Salsa con queso, piñones y dos sellos.',
    createdAtOffsetMin: 75,
  },
  {
    id: id(48),
    nombre: 'Mostaza Dijon',
    categoria: 'otros',
    ingredientes: ['agua', 'mostaza', 'vinagre', 'sal'],
    alergenos: [],
    sellos: ['exceso en sodio'],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'medio',
    confidence: 0.93,
    reglasAplicadas: [],
    explanation: 'Condimento con sello por sodio.',
    createdAtOffsetMin: 215,
  },
  {
    id: id(49),
    nombre: 'Mayonesa Light',
    categoria: 'otros',
    ingredientes: ['aceite vegetal', 'agua', 'huevo', 'vinagre'],
    alergenos: ['huevo'],
    sellos: ['exceso en grasas totales'],
    aptoVegano: false,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'medio',
    confidence: 0.91,
    reglasAplicadas: ['contiene_huevo'],
    explanation: 'Mayonesa con huevo y sello por grasas.',
    createdAtOffsetMin: 305,
  },
  {
    id: id(50),
    nombre: 'Aceite de Oliva Extra Virgen',
    categoria: 'otros',
    ingredientes: ['aceite de oliva extra virgen'],
    alergenos: [],
    sellos: [],
    aptoVegano: true,
    aptoCeliaco: true,
    aptoSinLactosa: true,
    riesgo: 'bajo',
    confidence: 0.97,
    reglasAplicadas: [],
    explanation: 'Producto simple sin alérgenos ni sellos.',
    createdAtOffsetMin: 580,
  },
];

// ---------------------------------------------------------------------------
// Validaciones invariantes (fail-fast — si alguien rompe el dataset)
// ---------------------------------------------------------------------------

function assertDatasetInvariants() {
  if (PRODUCTS.length !== 50) {
    throw new Error(`Expected 50 products, got ${PRODUCTS.length}`);
  }
  const ids = new Set<string>();
  for (const p of PRODUCTS) {
    if (ids.has(p.id)) throw new Error(`Duplicate id: ${p.id}`);
    ids.add(p.id);
    for (const a of p.alergenos) {
      if (!(ALERGENOS as readonly string[]).includes(a)) {
        throw new Error(`Alergeno desconocido en ${p.nombre}: ${a}`);
      }
    }
    for (const s of p.sellos) {
      if (!(SELLOS as readonly string[]).includes(s)) {
        throw new Error(`Sello desconocido en ${p.nombre}: ${s}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API — usado por `npm run seed` y por los tests de integración.
// ---------------------------------------------------------------------------

export const SEED_PRODUCTS: ReadonlyArray<SeedProduct> = PRODUCTS;
export const SEED_PRODUCT_IDS: ReadonlyArray<string> = PRODUCTS.map((p) => p.id);

/**
 * Inserta (idempotente) los 50 productos del dataset. Borra primero por ID
 * para que correr `npm run seed` dos veces no falle por unique constraint y
 * tampoco pise productos que el usuario haya analizado en dev.
 */
export async function seedDatabase(client: PrismaClient = prisma): Promise<number> {
  assertDatasetInvariants();
  const now = Date.now();
  const seedIds = SEED_PRODUCT_IDS as string[];
  await client.product.deleteMany({ where: { id: { in: seedIds } } });
  await client.product.createMany({
    data: PRODUCTS.map((p) => ({
      id: p.id,
      fileHash: `seed-${p.id}`,
      nombre: p.nombre,
      categoria: p.categoria,
      ingredientes: JSON.stringify(p.ingredientes),
      alergenos: JSON.stringify(p.alergenos),
      sellos: JSON.stringify(p.sellos),
      aptoVegano: p.aptoVegano,
      aptoCeliaco: p.aptoCeliaco,
      aptoSinLactosa: p.aptoSinLactosa,
      riesgo: p.riesgo,
      confidence: p.confidence,
      reglasAplicadas: JSON.stringify(p.reglasAplicadas),
      explanation: p.explanation,
      jsonRaw: buildJsonRaw(p),
      pipelineTrace: buildPipelineTrace(p),
      imagenPath: IMAGE_BY_CATEGORIA[p.categoria],
      promptVersion: PROMPT_VERSION,
      createdAt: new Date(now - p.createdAtOffsetMin * 60_000),
    })),
  });
  return PRODUCTS.length;
}

// ---------------------------------------------------------------------------
// Entry point — sólo corre cuando el archivo se ejecuta directo (no en import).
// ---------------------------------------------------------------------------

const isDirectRun =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  /seed\.ts$/.test(process.argv[1]);

if (isDirectRun) {
  seedDatabase()
    .then((n) => {
      console.warn(`[seed] OK — inserted ${n} products.`);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
