'use client';

/**
 * Drives the pipeline stepper visual progression during PROCESSING.
 *
 * TODO(US-33): replace the simulated timeline with real server events
 * (SSE / WebSocket / streaming response) so the stepper reflects actual
 * backend state. The current implementation matches the spec E06 §9 mid-
 * range timings so the UX feels right with the mock provider.
 *
 * Target durations (total ~9.4s) — 8 pasos (ver pipeline-steps.ts). La
 * extracción/lectura es el tramo largo; el resto son cortos.
 */
import { useEffect, useRef, useState } from 'react';

export type AnalyzingStage = 'UPLOADING' | 'PROCESSING';

const TIMELINE_MS: ReadonlyArray<number> = [700, 1400, 5200, 6200, 7000, 7800, 8600, 9400];
const TICK_INTERVAL_MS = 120;

export function useSimulatedPipelineStep(stage: AnalyzingStage): number {
  const [stepIndex, setStepIndex] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (stage !== 'PROCESSING') {
      // While uploading bytes, step 0 (Validación) is the live one.
      setStepIndex(0);
      startedAtRef.current = null;
      return;
    }
    startedAtRef.current = performance.now();
    setStepIndex(1);

    const intervalId = window.setInterval(() => {
      const startedAt = startedAtRef.current;
      if (startedAt === null) return;
      const elapsed = performance.now() - startedAt;
      const next = TIMELINE_MS.findIndex((threshold) => elapsed < threshold);
      setStepIndex(next === -1 ? TIMELINE_MS.length - 1 : Math.max(next, 1));
    }, TICK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [stage]);

  return stepIndex;
}
