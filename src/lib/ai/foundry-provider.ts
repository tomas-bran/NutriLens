/**
 * FoundryProvider — adapter para Azure AI Foundry (Phi-4 multimodal/mini)
 * sobre el endpoint OpenAI-compatible `/openai/v1`.
 *
 * Toda la lógica (retry, timeout, mapping de errores, prompts) vive en
 * `OpenAICompatibleProvider`. Acá sólo armamos el config a partir de las
 * env vars específicas de Foundry.
 */
import OpenAI from 'openai';
import { OpenAICompatibleProvider } from './openai-compatible-provider';

export class FoundryProvider extends OpenAICompatibleProvider {
  constructor(deps?: { client?: OpenAI }) {
    const multimodalModel = required('AZURE_AI_FOUNDRY_MODEL_MULTIMODAL');
    const miniModel = required('AZURE_AI_FOUNDRY_MODEL_MINI');
    const client =
      deps?.client ??
      new OpenAI({
        baseURL: required('AZURE_AI_FOUNDRY_ENDPOINT'),
        apiKey: required('AZURE_AI_FOUNDRY_KEY'),
      });
    super({ name: 'foundry', client, multimodalModel, miniModel });
  }
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var ${name} for FoundryProvider`);
  }
  return v;
}

// Re-export para mantener la API pública previa: tests y handlers importaban
// `mapProviderError` desde este archivo.
export { mapProviderError } from './openai-compatible-provider';
