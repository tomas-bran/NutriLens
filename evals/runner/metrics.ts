/**
 * Metrics — pure functions used by the eval runner.
 *
 * Each function returns a number in [0, 1] (or a tuple of precision/recall/F1)
 * so the reporter can aggregate without re-implementing the math.
 *
 * NOTE: this file is intentionally pure (no I/O, no model calls). Cover with
 * unit tests in tests/unit/eval-metrics.test.ts when US-40 is implemented.
 */

/** Levenshtein distance, iterative DP. */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(
        dp[j]! + 1, // delete
        dp[j - 1]! + 1, // insert
        prev + cost, // substitute
      );
      prev = tmp;
    }
  }
  return dp[n]!;
}

/**
 * Fuzzy similarity in [0, 1]. 1 = identical, 0 = totally different.
 * Normalizes case and trims before comparing.
 */
export function fuzzy(a: string, b: string): number {
  const aa = a.trim().toLowerCase();
  const bb = b.trim().toLowerCase();
  if (aa === bb) return 1;
  const maxLen = Math.max(aa.length, bb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(aa, bb) / maxLen;
}

/** Exact match → 1 or 0. */
export function exact<T>(a: T, b: T): number {
  return a === b ? 1 : 0;
}

export type PRF = { precision: number; recall: number; f1: number };

/**
 * F1 over sets of strings. Case-insensitive, order-insensitive.
 *
 * Returns precision = TP/(TP+FP), recall = TP/(TP+FN), f1 = 2PR/(P+R).
 * If both sets are empty, returns { p:1, r:1, f1:1 } (perfect match).
 */
export function f1Set(predicted: readonly string[], expected: readonly string[]): PRF {
  const pred = new Set(predicted.map((s) => s.toLowerCase().trim()));
  const exp = new Set(expected.map((s) => s.toLowerCase().trim()));
  if (pred.size === 0 && exp.size === 0) {
    return { precision: 1, recall: 1, f1: 1 };
  }
  let tp = 0;
  for (const p of pred) {
    if (exp.has(p)) tp++;
  }
  const fp = pred.size - tp;
  const fn = exp.size - tp;
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1 };
}

/**
 * Confusion matrix for binary classification (used by detect_label_kind).
 * Returns TP/FP/TN/FN counts and derived precision/recall/F1.
 */
export function confusionMatrix(
  pairs: { predicted: boolean; actual: boolean }[],
): { tp: number; fp: number; tn: number; fn: number } & PRF {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (const { predicted, actual } of pairs) {
    if (predicted && actual) tp++;
    else if (predicted && !actual) fp++;
    else if (!predicted && !actual) tn++;
    else fn++;
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { tp, fp, tn, fn, precision, recall, f1 };
}

/**
 * Confidence calibration: how much higher is the avg confidence on correct
 * cases vs incorrect ones. > 0 means the model "knows when it doesn't know".
 */
export function confidenceCalibration(samples: { confidence: number; correct: boolean }[]): {
  meanCorrect: number;
  meanWrong: number;
  diff: number;
} {
  const correct = samples.filter((s) => s.correct);
  const wrong = samples.filter((s) => !s.correct);
  const mean = (arr: typeof samples) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b.confidence, 0) / arr.length;
  const meanCorrect = mean(correct);
  const meanWrong = mean(wrong);
  return { meanCorrect, meanWrong, diff: meanCorrect - meanWrong };
}

/**
 * Weights for the aggregate extract_product score. Adjust here if the spec
 * §4.1 changes. Must sum to 1.0.
 */
export const EXTRACT_WEIGHTS = {
  producto: 0.1,
  categoria: 0.1,
  ingredientes: 0.15,
  alergenos: 0.2,
  sellos: 0.2,
  aptitudes: 0.1,
  riesgo: 0.15,
} as const;

export function aggregateExtractScore(
  scores: Record<keyof typeof EXTRACT_WEIGHTS, number>,
): number {
  let total = 0;
  for (const k of Object.keys(EXTRACT_WEIGHTS) as Array<keyof typeof EXTRACT_WEIGHTS>) {
    total += scores[k] * EXTRACT_WEIGHTS[k];
  }
  return total;
}
