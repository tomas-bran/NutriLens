/**
 * Pasos del pipeline de análisis — fuente única para el "Pipeline observable"
 * (estado idle) y el "Pipeline en curso" (mientras analiza). Reflejan los pasos
 * reales de nuestro backend (E06 §3): validar → detectar etiqueta → leer →
 * estructurar → reglas → riesgo → explicación → persistir.
 */
import type { IconName } from '@/components/ui/Icon';

export interface PipelineStepDef {
  id: string;
  title: string;
  detail: string;
  pendingIcon: IconName;
}

export const PIPELINE_STEPS: ReadonlyArray<PipelineStepDef> = [
  {
    id: 'validate',
    title: 'Validación de etiqueta',
    detail: 'Formato y tamaño del archivo',
    pendingIcon: 'check',
  },
  {
    id: 'detect',
    title: '¿Es una etiqueta?',
    detail: 'Verificación previa',
    pendingIcon: 'scan-eye',
  },
  {
    id: 'extract',
    title: 'Lectura de la etiqueta',
    detail: 'Reconocimiento de texto e imagen',
    pendingIcon: 'scan-line',
  },
  {
    id: 'schema',
    title: 'Estructura de los datos',
    detail: 'Organización de la información',
    pendingIcon: 'file-text',
  },
  {
    id: 'rules',
    title: 'Clasificación por reglas',
    detail: 'Gluten, lácteos y origen animal',
    pendingIcon: 'filter',
  },
  {
    id: 'risk',
    title: 'Cálculo de riesgo',
    detail: 'Según sellos y alérgenos',
    pendingIcon: 'shield-check',
  },
  {
    id: 'explain',
    title: 'Explicación en lenguaje claro',
    detail: 'Resumen entendible',
    pendingIcon: 'sparkles',
  },
  {
    id: 'persist',
    title: 'Guardar en tu catálogo',
    detail: 'Disponible en tu cuenta',
    pendingIcon: 'history',
  },
];

export const PIPELINE_STEPS_COUNT = PIPELINE_STEPS.length;
