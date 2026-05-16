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
import { FoundryProvider } from './foundry-provider';
import { MockIaProvider } from './mock-provider';
import { logger } from '@/lib/logger';
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
      cached = new FoundryProvider();
      break;
    case 'azure-openai':
      // TODO(post-approval): instantiate real AzureOpenAIProvider.
      logger.warn('ia.fallback_to_mock', {
        requested: 'azure-openai',
        reason: 'AzureOpenAIProvider not implemented yet',
      });
      cached = new MockIaProvider();
      break;
    default:
      logger.warn('ia.fallback_to_mock', { requested: kind, reason: 'unknown provider' });
      cached = new MockIaProvider();
  }
  return cached;
}

/** Test-only: reset the cached singleton so swapping IA_PROVIDER in tests works. */
export function _resetIaProvider(): void {
  cached = null;
}

export { FoundryProvider } from './foundry-provider';
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
