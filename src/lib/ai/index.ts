/**
 * Bootstrap del IaProvider según `IA_PROVIDER`.
 * Ver `docs/specs/00-overview.md §7` y `.env.example`.
 *
 * Valores soportados:
 *   - "mock"          → MockIaProvider (default fail-safe)
 *   - "foundry"       → FoundryProvider (Azure AI Foundry, Phi-4)
 *   - "azure-openai"  → AzureOpenAIProvider (Azure OpenAI, gpt-4o)
 *
 * Los providers reales se implementan en US-08 / US-09 (E02). Por ahora
 * el switch solo conoce el mock; al implementar FoundryProvider, agregar
 * la rama correspondiente.
 */
import { MockIaProvider } from './mock-provider';
import type { IaProvider } from './types';

let cached: IaProvider | null = null;

export function getIaProvider(): IaProvider {
  if (cached) return cached;
  const kind = process.env.IA_PROVIDER ?? 'mock';
  switch (kind) {
    case 'mock':
      cached = new MockIaProvider();
      break;
    case 'foundry':
      // TODO(US-08): instanciar FoundryProvider real.
      console.warn(
        '[ia] IA_PROVIDER=foundry pedido pero FoundryProvider aún no está implementado. Usando MockIaProvider.',
      );
      cached = new MockIaProvider();
      break;
    case 'azure-openai':
      // TODO(post-aprobación): instanciar AzureOpenAIProvider real.
      console.warn(
        '[ia] IA_PROVIDER=azure-openai pedido pero AzureOpenAIProvider aún no está implementado. Usando MockIaProvider.',
      );
      cached = new MockIaProvider();
      break;
    default:
      console.warn(`[ia] IA_PROVIDER='${kind}' desconocido. Usando MockIaProvider.`);
      cached = new MockIaProvider();
  }
  return cached;
}

export { MockIaProvider } from './mock-provider';
export { stripJsonFences } from './strip-json-fences';
export type { IaProvider, IaCallResult, TokenUsage, AnalyzeOpts, ExplainOpts, AnswerOpts, SavedProductLite } from './types';
