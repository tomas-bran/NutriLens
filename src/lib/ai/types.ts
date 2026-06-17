/**
 * Shared types for the IaProvider abstraction.
 * See `docs/specs/00-overview.md §7` and `E02 §7`.
 */
import type { ProductExtraction } from '@schemas/product';

export type TokenUsage = {
  in: number;
  out: number;
};

export type IaCallResult = {
  raw: string;
  usage: TokenUsage;
  latencyMs: number;
};

export type AnalyzeOpts = {
  promptVersion: string;
  timeoutMs?: number;
  /**
   * Free-form context passed to the prompt template (used for the corrective
   * retry: `{ previous, problems }` is interpolated into the corrective prompt).
   * See E02 §5.1.
   */
  extra?: Record<string, string>;
};

export type ExplainOpts = {
  promptVersion: string;
  timeoutMs?: number;
  /** Free-form context interpolated into the explain prompt (e.g. reglas_aplicadas). */
  extra?: Record<string, string>;
};

export type AnswerOpts = {
  promptVersion: string;
  timeoutMs?: number;
  /**
   * Free-form context interpolated into the answer prompt. US-31 lo usa para
   * pasar `intent_kind` al prompt de answer y disparar el formato de
   * tabla markdown cuando es una comparación.
   */
  extra?: Record<string, string>;
};

export type ParseIntentOpts = {
  promptVersion: string;
  timeoutMs?: number;
};

export type EmbedOpts = {
  timeoutMs?: number;
};

export type EmbedResult = {
  /** Vector normalizado del modelo de embeddings (1536 dims). */
  vector: number[];
  usage: TokenUsage;
  latencyMs: number;
};

export type SavedProductLite = {
  id: string;
  nombre: string;
  categoria: string;
  riesgo: string;
  alergenos: string[];
  sellos: string[];
  /** Primeros N ingredientes reales del producto (NL-503: data grounding). */
  ingredientes: string[];
};

export interface IaProvider {
  analyzeLabel(file: Buffer, mime: string, opts: AnalyzeOpts): Promise<IaCallResult>;
  classifyLabelKind(file: Buffer, mime: string, opts: AnalyzeOpts): Promise<IaCallResult>;
  generateExplanation(product: ProductExtraction, opts: ExplainOpts): Promise<IaCallResult>;
  /**
   * Parsea la pregunta del usuario y devuelve el intent como JSON (string raw).
   * Spec: `E05 §4` — modelo text-only, `temperature: 0`, `max_tokens: 200`.
   */
  parseIntent(question: string, opts: ParseIntentOpts): Promise<IaCallResult>;
  answerWithContext(
    question: string,
    products: SavedProductLite[],
    opts: AnswerOpts,
  ): Promise<IaCallResult>;
  /**
   * NL-304: igual que `answerWithContext` pero streameando deltas de texto.
   * El caller acumula y sanitiza al final (la sanitización opera sobre el
   * texto completo).
   */
  answerWithContextStream(
    question: string,
    products: SavedProductLite[],
    opts: AnswerOpts,
  ): AsyncIterable<string>;
  /**
   * Embedding de un texto (NL-401). Usado por persist (al guardar un
   * producto) y por el retrieve semántico del chat (NL-402).
   */
  embed(text: string, opts?: EmbedOpts): Promise<EmbedResult>;
}
