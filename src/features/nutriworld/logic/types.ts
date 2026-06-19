/**
 * Tipos de la capa lógica de NutriWorld (separada del 3D, testeable). El parser
 * (reglas o IA) produce un `ParsedIntent`; `resolveIntent` lo convierte en el
 * `AgentResult` que mueve al NPC y resalta productos.
 */
import type { NutriProduct, ProductCategory, Risk } from '../data/products';
import type { ZoneId } from '../data/zones';

export interface NutriFilters {
  apto_celiaco?: boolean;
  apto_sin_lactosa?: boolean;
  apto_vegano?: boolean;
  max_riesgo?: Risk;
}

export interface ParsedIntent {
  /** `clarify` = consulta ambigua (sin filtros usables) → el NPC pregunta. */
  kind: 'find_products' | 'clarify';
  category?: ProductCategory;
  filters: NutriFilters;
}

/** Estado que el resultado le imprime al NPC. */
export type AgentStatus = 'guiding' | 'thinking' | 'no_results';

export interface AgentResult {
  message: string;
  status: AgentStatus;
  category: ProductCategory | null;
  filters: NutriFilters;
  targetZone: ZoneId | null;
  highlightProductIds: string[];
  recommended: NutriProduct[];
}

/** Lo que el endpoint `/api/nutriworld/agent` devuelve al cliente. */
export interface AgentResponse {
  message: string;
  status: AgentStatus;
  targetZone: ZoneId | null;
  highlightProductIds: string[];
  /** De dónde salió el intent: la IA del chat o el parser por reglas (fallback). */
  source: 'ai' | 'rules';
}
