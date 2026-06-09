/**
 * OpenAIProvider — adapter para la API estándar de OpenAI (api.openai.com).
 *
 * Env vars:
 *   OPENAI_API_KEY          REQUIRED  — tu API key de platform.openai.com
 *   OPENAI_MODEL_MULTIMODAL           — modelo con visión (default: gpt-4o)
 *   OPENAI_MODEL_MINI                 — modelo rápido/barato (default: gpt-4o-mini)
 */
import OpenAI from 'openai';
import { OpenAICompatibleProvider } from './openai-compatible-provider';

export class OpenAIProvider extends OpenAICompatibleProvider {
  constructor(deps?: { client?: OpenAI }) {
    const apiKey = required('OPENAI_API_KEY');
    const multimodalModel = process.env.OPENAI_MODEL_MULTIMODAL ?? 'gpt-4o';
    const miniModel = process.env.OPENAI_MODEL_MINI ?? 'gpt-4o-mini';
    const client = deps?.client ?? new OpenAI({ apiKey });
    super({ name: 'openai', client, multimodalModel, miniModel });
  }
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name} for OpenAIProvider`);
  return v;
}
