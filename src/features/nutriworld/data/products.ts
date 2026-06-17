/**
 * Catálogo mockeado de NutriWorld (beta). Curado a mano para que la escena 3D
 * quede limpia y los flujos de la demo funcionen ("galletitas aptas celíacos"
 * → góndola Sin TACC, etc.). Los productos reales de NutriLens son una mejora
 * posterior (ver requirements §"Must be").
 *
 * `zone` = dónde está físicamente en el mundo (no siempre coincide con
 * `category`: p.ej. una galletita vegana vive en la góndola Vegano, y la leche
 * de almendras —categoría bebidas— vive en la góndola Sin lactosa).
 * `position` = [x, y, z] sobre el estante de su zona.
 */
import type { ZoneId } from './zones';

export type ProductCategory = 'galletitas' | 'snacks' | 'bebidas' | 'cereales';
export type Risk = 'bajo' | 'medio' | 'alto';

export interface NutriProduct {
  id: string;
  name: string;
  category: ProductCategory;
  zone: ZoneId;
  risk: Risk;
  aptoCeliaco: boolean;
  aptoSinLactosa: boolean;
  aptoVegano: boolean;
  allergens: string[];
  seals: string[];
  ingredients: string[];
  explanation: string;
  position: [number, number, number];
}

export const PRODUCTS: NutriProduct[] = [
  // ── Góndola Sin TACC ──────────────────────────────────────────────────
  {
    id: 'prod_avena_sintacc',
    name: 'Avena Crunch Sin TACC',
    category: 'galletitas',
    zone: 'sin_tacc',
    risk: 'bajo',
    aptoCeliaco: true,
    aptoSinLactosa: true,
    aptoVegano: true,
    allergens: [],
    seals: [],
    ingredients: [
      'harina de avena sin TACC',
      'azúcar mascabo',
      'aceite de girasol',
      'chips de chocolate',
    ],
    explanation: 'Buena opción dentro de galletitas: sin gluten detectado y riesgo bajo.',
    position: [6.1, 1, -4],
  },
  {
    id: 'prod_rice_cookies',
    name: 'Rice Cookies',
    category: 'galletitas',
    zone: 'sin_tacc',
    risk: 'bajo',
    aptoCeliaco: true,
    aptoSinLactosa: true,
    aptoVegano: false,
    allergens: ['huevo'],
    seals: [],
    ingredients: ['harina de arroz', 'aceite vegetal', 'azúcar', 'huevo'],
    explanation: 'Apta para celíacos según los datos cargados. Riesgo bajo.',
    position: [8, 1, -4],
  },
  {
    id: 'prod_arroz_integral',
    name: 'Galletitas de Arroz Integral',
    category: 'galletitas',
    zone: 'sin_tacc',
    risk: 'medio',
    aptoCeliaco: true,
    aptoSinLactosa: true,
    aptoVegano: true,
    allergens: [],
    seals: ['exceso en sodio'],
    ingredients: ['arroz integral', 'sal', 'aceite de girasol'],
    explanation: 'Apta para celíacos, pero tiene un sello de exceso en sodio: riesgo medio.',
    position: [9.9, 1, -4],
  },
  // ── Góndola Vegano ────────────────────────────────────────────────────
  {
    id: 'prod_barrita_vegana',
    name: 'Barrita Vegana de Cereal',
    category: 'cereales',
    zone: 'vegano',
    risk: 'bajo',
    aptoCeliaco: false,
    aptoSinLactosa: true,
    aptoVegano: true,
    allergens: ['gluten'],
    seals: [],
    ingredients: ['avena', 'dátiles', 'semillas de girasol', 'pasas'],
    explanation: '100% vegetal y riesgo bajo. Contiene gluten: no apta para celíacos.',
    position: [-8.7, 1, 4],
  },
  {
    id: 'prod_galletas_coco',
    name: 'Galletas Veganas de Coco',
    category: 'galletitas',
    zone: 'vegano',
    risk: 'medio',
    aptoCeliaco: false,
    aptoSinLactosa: true,
    aptoVegano: true,
    allergens: ['gluten'],
    seals: ['exceso en azúcares'],
    ingredients: ['harina de trigo', 'coco rallado', 'azúcar', 'aceite de coco'],
    explanation: 'Vegana y sin lactosa, pero con gluten y un sello de exceso en azúcares.',
    position: [-7.3, 1, 4],
  },
  // ── Góndola Sin lactosa ───────────────────────────────────────────────
  {
    id: 'prod_leche_almendras',
    name: 'Leche de Almendras',
    category: 'bebidas',
    zone: 'sin_lactosa',
    risk: 'bajo',
    aptoCeliaco: true,
    aptoSinLactosa: true,
    aptoVegano: true,
    allergens: ['frutos secos'],
    seals: [],
    ingredients: ['agua', 'almendras', 'sal'],
    explanation: 'Sin lactosa, vegana y sin gluten. Contiene frutos secos.',
    position: [3.3, 1, 8],
  },
  {
    id: 'prod_yogur_coco',
    name: 'Yogur de Coco',
    category: 'bebidas',
    zone: 'sin_lactosa',
    risk: 'bajo',
    aptoCeliaco: true,
    aptoSinLactosa: true,
    aptoVegano: true,
    allergens: [],
    seals: [],
    ingredients: ['leche de coco', 'fermentos', 'almidón de tapioca'],
    explanation: 'Alternativa sin lactosa de riesgo bajo, también apta vegana y celíaca.',
    position: [4.7, 1, 8],
  },
  // ── Góndola Snacks (incluye los NO aptos / de mayor riesgo) ───────────
  {
    id: 'prod_choco_crunch',
    name: 'Choco Crunch',
    category: 'snacks',
    zone: 'snacks',
    risk: 'alto',
    aptoCeliaco: false,
    aptoSinLactosa: false,
    aptoVegano: false,
    allergens: ['gluten', 'leche'],
    seals: ['exceso en azúcares', 'exceso en grasas saturadas'],
    ingredients: ['harina de trigo', 'azúcar', 'leche en polvo', 'cacao'],
    explanation: 'No recomendable para personas celíacas o con intolerancia a la lactosa.',
    position: [-6.1, 1, -2],
  },
  {
    id: 'prod_mix_frutos',
    name: 'Mix de Frutos Secos',
    category: 'snacks',
    zone: 'snacks',
    risk: 'bajo',
    aptoCeliaco: true,
    aptoSinLactosa: true,
    aptoVegano: true,
    allergens: ['frutos secos'],
    seals: [],
    ingredients: ['almendras', 'nueces', 'castañas de cajú', 'pasas'],
    explanation: 'Snack de riesgo bajo, apto celíaco y vegano. Contiene frutos secos.',
    position: [-8.1, 1, -2],
  },
  {
    id: 'prod_papas_onduladas',
    name: 'Papas Onduladas',
    category: 'snacks',
    zone: 'snacks',
    risk: 'alto',
    aptoCeliaco: true,
    aptoSinLactosa: true,
    aptoVegano: true,
    allergens: [],
    seals: ['exceso en sodio', 'exceso en grasas saturadas'],
    ingredients: ['papa', 'aceite vegetal', 'sal'],
    explanation: 'Sin gluten ni lactosa, pero riesgo alto por sellos de sodio y grasas.',
    position: [-3.9, 1, -2],
  },
];

export function getProductById(id: string): NutriProduct | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
