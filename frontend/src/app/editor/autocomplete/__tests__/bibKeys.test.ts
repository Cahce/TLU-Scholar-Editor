import { describe, it, expect } from "vitest";
import { extractBibKeys } from "../utils/bibKeys";

describe("extractBibKeys", () => {
  it("returns [] for empty input", () => {
    expect(extractBibKeys("")).toEqual([]);
  });

  it("parses a simple entry", () => {
    const src = `@article{smith2024,
  title = {Hello World},
  author = {Smith, John},
  year = {2024}
}`;
    const out = extractBibKeys(src);
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe("smith2024");
    expect(out[0].detail).toBe("Smith 2024");
    expect(out[0].info).toBe("Hello World");
  });

  it("extracts multiple entries", () => {
    const src = `
@article{a2020, title = {A}, author = {Doe, Jane}, year = {2020}}
@book{b2021, title = {B}, author = {Smith, John and Doe, Jane}, year = {2021}}
`;
    const out = extractBibKeys(src);
    expect(out.map((e) => e.key)).toEqual(["a2020", "b2021"]);
    expect(out[1].detail).toBe("Smith 2021"); // first author surname
  });

  it("handles quoted values", () => {
    const src = `@misc{k, title = "Quoted Title", year = "2023"}`;
    const out = extractBibKeys(src);
    expect(out[0].info).toBe("Quoted Title");
    expect(out[0].detail).toBe("2023");
  });

  it("tolerates malformed input", () => {
    const src = `@article{broken, title = {hello`;
    const out = extractBibKeys(src);
    // Should not throw; returns at minimum the key it managed to read.
    expect(out[0]?.key).toBe("broken");
  });
});
