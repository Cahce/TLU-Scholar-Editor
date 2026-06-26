import { describe, it, expect } from "vitest";
import { extractHayagrivaKeys } from "../utils/hayagrivaKeys";

describe("extractHayagrivaKeys", () => {
  it("returns [] for empty input", () => {
    expect(extractHayagrivaKeys("")).toEqual([]);
  });

  it("returns [] for malformed YAML", () => {
    expect(extractHayagrivaKeys(":::not yaml:::")).toEqual([]);
  });

  it("parses a single entry", () => {
    const src = `
smith2024:
  type: article
  title: "Machine Learning in Practice"
  author:
    - "Smith, John"
    - "Doe, Jane"
  date: 2024
`;
    const out = extractHayagrivaKeys(src);
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe("smith2024");
    expect(out[0].detail).toBe("Smith 2024");
    expect(out[0].info).toBe("Machine Learning in Practice");
  });

  it("handles author as string", () => {
    const src = `
single:
  type: misc
  title: "x"
  author: "Doe, Jane"
  date: "2023-01"
`;
    const out = extractHayagrivaKeys(src);
    expect(out[0].detail).toBe("Doe 2023");
  });

  it("ignores non-map top-level entries", () => {
    const src = `
good:
  type: misc
  title: ok
bad: "not a map"
`;
    const out = extractHayagrivaKeys(src);
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe("good");
  });
});
