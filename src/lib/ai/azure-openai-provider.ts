/**
 * AzureOpenAIProvider — adapter para Azure OpenAI (gpt-4o, gpt-5.x, …).
 *
 * Mismo SDK que Foundry, distinta baseURL/key/modelos. Si
 * `AZURE_OPENAI_MODEL_MINI` no está seteada, reusa el multimodal para los
 * roles text-only (el caso del demo con un solo modelo multimodal capaz
 * de responder texto, ej. gpt-5.1).
 */
import OpenAI from 'openai';
import { OpenAICompatibleProvider } from './openai-compatible-provider';

export class AzureOpenAIProvider extends OpenAICompatibleProvider {
  constructor(deps?: { client?: OpenAI }) {
    const multimodalModel = required('AZURE_OPENAI_MODEL_MULTIMODAL');
    const miniModel = process.env.AZURE_OPENAI_MODEL_MINI || multimodalModel;
    const client =
      deps?.client ??
      new OpenAI({
        baseURL: required('AZURE_OPENAI_ENDPOINT'),
        apiKey: required('AZURE_OPENAI_KEY'),
      });
    super({
      name: 'azure-openai',
      client,
      multimodalModel,
      miniModel,
      // Nombre del deployment de embeddings (NL-401); el default de la base
      // ('text-embedding-3-small') coincide con el deployment creado en Azure.
      embeddingModel: process.env.AZURE_OPENAI_MODEL_EMBEDDINGS || undefined,
    });
  }
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var ${name} for AzureOpenAIProvider`);
  }
  return v;
}
