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
};

export type ExplainOpts = {
  promptVersion: string;
  timeoutMs?: number;
};

export type AnswerOpts = {
  promptVersion: string;
  timeoutMs?: number;
};

export type SavedProductLite = {
  id: string;
  nombre: string;
  categoria: string;
  riesgo: string;
  alergenos: string[];
  sellos: string[];
};

export interface IaProvider {
  analyzeLabel(file: Buffer, mime: string, opts: AnalyzeOpts): Promise<IaCallResult>;
  classifyLabelKind(file: Buffer, mime: string, opts: AnalyzeOpts): Promise<IaCallResult>;
  generateExplanation(product: ProductExtraction, opts: ExplainOpts): Promise<IaCallResult>;
  answerWithContext(
    question: string,
    products: SavedProductLite[],
    opts: AnswerOpts,
  ): Promise<IaCallResult>;
}
