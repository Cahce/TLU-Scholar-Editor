import { describe, it, expect } from "vitest";
import { extractBibReferences } from "../extractBibReferences";

describe("extractBibReferences", () => {
  it("returns [] for empty input", () => {
    expect(extractBibReferences("")).toEqual([]);
  });

  it("extracts a single quoted path", () => {
    expect(extractBibReferences(`#bibliography("ref.bib")`)).toEqual([
      "ref.bib",
    ]);
  });

  it("extracts from a nested folder path", () => {
    expect(extractBibReferences(`#bibliography("a/b/c.yml")`)).toEqual([
      "a/b/c.yml",
    ]);
  });

  it("extracts first path from array form", () => {
    expect(
      extractBibReferences(`#bibliography(("primary.bib", "secondary.yml"))`),
    ).toEqual(["primary.bib"]);
  });

  it("ignores additional named args after path", () => {
    expect(
      extractBibReferences(`#bibliography("ref.bib", style: "ieee")`),
    ).toEqual(["ref.bib"]);
  });

  it("returns multiple refs when document has multiple calls", () => {
    const src = `
      #bibliography("a.bib")
      ... some content ...
      #bibliography("b.yml")
    `;
    expect(extractBibReferences(src)).toEqual(["a.bib", "b.yml"]);
  });

  it("survives whitespace inside the call", () => {
    expect(extractBibReferences(`#bibliography  (  "ref.bib"  )`)).toEqual([
      "ref.bib",
    ]);
  });

  it("returns [] when no bibliography call", () => {
    expect(extractBibReferences(`#figure(image("logo.png"))`)).toEqual([]);
  });

  it("is reusable (regex lastIndex reset)", () => {
    const src = `#bibliography("a.bib")`;
    expect(extractBibReferences(src)).toEqual(["a.bib"]);
    expect(extractBibReferences(src)).toEqual(["a.bib"]);
  });
});
