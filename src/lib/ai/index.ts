/**
 * IaProvider bootstrap, selected via `IA_PROVIDER` env var.
 * See `docs/specs/00-overview.md §7` and `.env.example`.
 *
 * Supported values:
 *   - "mock"          → MockIaProvider (fail-safe default)
 *   - "foundry"       → FoundryProvider (Azure AI Foundry, Phi-4)
 *   - "azure-openai"  → AzureOpenAIProvider (Azure OpenAI endpoint)
 *   - "openai"        → OpenAIProvider (api.openai.com, OPENAI_API_KEY)
 *
 * Real providers are implemented in US-08 / US-09 (E02). For now the
 * switch only knows the mock; when implementing FoundryProvider, wire
 * its branch here.
 */
import { AzureOpenAIProvider } from './azure-openai-provider';
import { FoundryProvider } from './foundry-provider';
import { MockIaProvider } from './mock-provider';
import { OpenAIProvider } from './openai-provider';
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
      cached = new AzureOpenAIProvider();
      break;
    case 'openai':
      cached = new OpenAIProvider();
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

export { AzureOpenAIProvider } from './azure-openai-provider';
export { FoundryProvider } from './foundry-provider';
export { MockIaProvider } from './mock-provider';
export { OpenAIProvider } from './openai-provider';
export { OpenAICompatibleProvider, mapProviderError } from './openai-compatible-provider';
export { stripJsonFences } from './strip-json-fences';
export type {
  IaProvider,
  IaCallResult,
  TokenUsage,
  AnalyzeOpts,
  ExplainOpts,
  AnswerOpts,
  ParseIntentOpts,
  SavedProductLite,
} from './types';
