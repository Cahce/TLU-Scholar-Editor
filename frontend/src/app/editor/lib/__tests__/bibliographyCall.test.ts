import { describe, it, expect } from "vitest";
import {
  findBibliographyCall,
  buildStyleEdit,
  type SourceEdit,
} from "../bibliographyCall";

function apply(source: string, edit: SourceEdit): string {
  return source.slice(0, edit.from) + edit.insert + source.slice(edit.to);
}

describe("findBibliographyCall", () => {
  it("returns null when there is no #bibliography call", () => {
    expect(findBibliographyCall("= Title\nsome text")).toBeNull();
  });

  it("parses path without a style argument", () => {
    const call = findBibliographyCall('#bibliography("refs.bib")');
    expect(call).not.toBeNull();
    expect(call!.path).toBe("refs.bib");
    expect(call!.style).toBeNull();
    expect(call!.styleValueRange).toBeNull();
  });

  it("parses path and style", () => {
    const src = '#bibliography("refs.bib", style: "ieee")';
    const call = findBibliographyCall(src)!;
    expect(call.path).toBe("refs.bib");
    expect(call.style).toBe("ieee");
    // styleValueRange points at the content between the quotes
    expect(src.slice(call.styleValueRange!.from, call.styleValueRange!.to)).toBe("ieee");
  });

  it("parses style after other named args", () => {
    const call = findBibliographyCall(
      '#bibliography("r.bib", title: "Tài liệu", style: "mla")',
    )!;
    expect(call.style).toBe("mla");
  });

  it("accepts a .csl path as the style value", () => {
    const call = findBibliographyCall('#bibliography("r.bib", style: "styles/tlu.csl")')!;
    expect(call.style).toBe("styles/tlu.csl");
  });

  it("does not end the call at a ')' inside a string literal", () => {
    const call = findBibliographyCall('#bibliography("we(ir)d.bib", style: "ieee")')!;
    expect(call.path).toBe("we(ir)d.bib");
    expect(call.style).toBe("ieee");
  });

  it("returns null for unbalanced parentheses", () => {
    expect(findBibliographyCall('#bibliography("refs.bib"')).toBeNull();
  });
});

describe("buildStyleEdit", () => {
  it("replaces an existing style value in place", () => {
    const src = '#bibliography("refs.bib", style: "ieee")';
    const call = findBibliographyCall(src)!;
    const edit = buildStyleEdit(src, call, "apa");
    expect(apply(src, edit)).toBe('#bibliography("refs.bib", style: "apa")');
  });

  it("inserts a style argument when missing", () => {
    const src = '#bibliography("refs.bib")';
    const call = findBibliographyCall(src)!;
    const edit = buildStyleEdit(src, call, "apa");
    const result = apply(src, edit);
    expect(result).toBe('#bibliography("refs.bib", style: "apa")');
    // round-trips: the new style is parseable
    expect(findBibliographyCall(result)!.style).toBe("apa");
  });

  it("does not double the comma when one already trails the args", () => {
    const src = '#bibliography("refs.bib", )';
    const call = findBibliographyCall(src)!;
    const result = apply(src, buildStyleEdit(src, call, "ieee"));
    expect(findBibliographyCall(result)!.style).toBe("ieee");
    expect(result).not.toContain(",,");
  });

  it("can set a .csl path as style", () => {
    const src = '#bibliography("refs.bib", style: "ieee")';
    const call = findBibliographyCall(src)!;
    const result = apply(src, buildStyleEdit(src, call, "styles/tlu.csl"));
    expect(findBibliographyCall(result)!.style).toBe("styles/tlu.csl");
  });
});
