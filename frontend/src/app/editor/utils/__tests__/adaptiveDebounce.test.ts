import { describe, it, expect } from "vitest";
import {
  computeAdaptiveDebounce,
  DEBOUNCE_MAX_MS,
  DEBOUNCE_MIN_MS,
  nextEma,
} from "../adaptiveDebounce";

describe("computeAdaptiveDebounce", () => {
  it("stays at the cap for cold cycles (no sample)", () => {
    expect(computeAdaptiveDebounce(null)).toBe(DEBOUNCE_MAX_MS);
  });

  it("floors at 150ms for fast incremental compiles", () => {
    expect(computeAdaptiveDebounce(5)).toBe(DEBOUNCE_MIN_MS);
    expect(computeAdaptiveDebounce(70)).toBe(DEBOUNCE_MIN_MS);
  });

  it("scales ~2x in the middle range", () => {
    expect(computeAdaptiveDebounce(120)).toBe(240);
    expect(computeAdaptiveDebounce(200)).toBe(400);
  });

  it("caps at 750ms for slow documents", () => {
    expect(computeAdaptiveDebounce(400)).toBe(DEBOUNCE_MAX_MS);
    expect(computeAdaptiveDebounce(5000)).toBe(DEBOUNCE_MAX_MS);
  });
});

describe("nextEma", () => {
  it("adopts the first sample directly", () => {
    expect(nextEma(null, 80)).toBe(80);
  });

  it("converges toward repeated samples", () => {
    let ema: number | null = null;
    for (let i = 0; i < 24; i++) ema = nextEma(ema, 100);
    expect(Math.abs((ema as number) - 100)).toBeLessThan(1);
  });

  it("moves partially toward a new sample (alpha 0.3)", () => {
    expect(nextEma(100, 200)).toBe(130);
  });
});
