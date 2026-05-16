/**
 * IaProvider bootstrap, selected via `IA_PROVIDER` env var.
 * See `docs/specs/00-overview.md §7` and `.env.example`.
 *
 * Supported values:
 *   - "mock"          → MockIaProvider (fail-safe default)
 *   - "foundry"       → FoundryProvider (Azure AI Foundry, Phi-4)
 *   - "azure-openai"  → AzureOpenAIProvider (Azure OpenAI, gpt-4o)
 *
 * Real providers are implemented in US-08 / US-09 (E02). For now the
 * switch only knows the mock; when implementing FoundryProvider, wire
 * its branch here.
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
      // TODO(US-08): instantiate real FoundryProvider.
      console.warn(
        '[ia] IA_PROVIDER=foundry requested but FoundryProvider is not implemented yet. Falling back to MockIaProvider.',
      );
      cached = new MockIaProvider();
      break;
    case 'azure-openai':
      // TODO(post-approval): instantiate real AzureOpenAIProvider.
      console.warn(
        '[ia] IA_PROVIDER=azure-openai requested but AzureOpenAIProvider is not implemented yet. Falling back to MockIaProvider.',
      );
      cached = new MockIaProvider();
      break;
    default:
      console.warn(`[ia] Unknown IA_PROVIDER='${kind}'. Falling back to MockIaProvider.`);
      cached = new MockIaProvider();
  }
  return cached;
}

export { MockIaProvider } from './mock-provider';
export { stripJsonFences } from './strip-json-fences';
export type {
  IaProvider,
  IaCallResult,
  TokenUsage,
  AnalyzeOpts,
  ExplainOpts,
  AnswerOpts,
  SavedProductLite,
} from './types';
