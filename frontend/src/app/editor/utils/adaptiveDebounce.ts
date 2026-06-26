/**
 * Adaptive preview debounce (spec: typing-latency-and-follow-preview FT-1).
 *
 * The fixed 750ms debounce was sized for full recompiles. With the
 * incremental pipeline a compile cycle is often a few ms — so the debounce
 * itself became the dominant typing latency. Scale it to the machine/document
 * actually in front of us: wait ~2× the recent compile time, floored at
 * 150ms (don't compile mid-word) and capped at the old 750ms (slow docs keep
 * the old behaviour). Cold cycles (no sample yet) stay at the cap.
 */

export const DEBOUNCE_MIN_MS = 150;
export const DEBOUNCE_MAX_MS = 750;

const K = 2;
const EMA_ALPHA = 0.3;

/** Exponential moving average over compile-duration samples. */
export function nextEma(prevEma: number | null, sampleMs: number): number {
  if (prevEma == null) return sampleMs;
  return prevEma + EMA_ALPHA * (sampleMs - prevEma);
}

/** Debounce for the next cycle given the compile-time EMA (null = cold). */
export function computeAdaptiveDebounce(emaMs: number | null): number {
  if (emaMs == null) return DEBOUNCE_MAX_MS;
  return Math.min(
    DEBOUNCE_MAX_MS,
    Math.max(DEBOUNCE_MIN_MS, Math.round(K * emaMs)),
  );
}
