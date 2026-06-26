import { describe, it, expect } from "vitest";
import { detectBibFormat, isBibPath, formatLabel } from "../bibFormat";

describe("detectBibFormat", () => {
  it("returns 'bibtex' for .bib", () => {
    expect(detectBibFormat("ref.bib")).toBe("bibtex");
    expect(detectBibFormat("a/b/c.bib")).toBe("bibtex");
  });

  it("returns 'hayagriva' for .yml / .yaml", () => {
    expect(detectBibFormat("ref.yml")).toBe("hayagriva");
    expect(detectBibFormat("ref.yaml")).toBe("hayagriva");
  });

  it("is case-insensitive", () => {
    expect(detectBibFormat("REF.BIB")).toBe("bibtex");
    expect(detectBibFormat("ref.YAML")).toBe("hayagriva");
  });

  it("returns null for non-bibliography paths", () => {
    expect(detectBibFormat("main.typ")).toBeNull();
    expect(detectBibFormat("logo.png")).toBeNull();
    expect(detectBibFormat("")).toBeNull();
  });
});

describe("isBibPath", () => {
  it("matches the detectBibFormat semantics", () => {
    expect(isBibPath("a.bib")).toBe(true);
    expect(isBibPath("a.yml")).toBe(true);
    expect(isBibPath("a.yaml")).toBe(true);
    expect(isBibPath("a.txt")).toBe(false);
  });
});

describe("formatLabel", () => {
  it("returns human-readable labels", () => {
    expect(formatLabel("bibtex")).toBe("BibTeX");
    expect(formatLabel("hayagriva")).toBe("Hayagriva YAML");
  });
});
