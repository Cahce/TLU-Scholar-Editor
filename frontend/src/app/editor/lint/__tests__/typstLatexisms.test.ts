import { describe, expect, it } from "vitest";

import { findTypstLatexisms } from "../typstLatexisms";

describe("findTypstLatexisms", () => {
  it("flags ^{...} superscript braces inside math", () => {
    const text = "$ x^2 + y^{2} $";
    const found = findTypstLatexisms(text);
    expect(found).toHaveLength(1);
    const at = text.slice(found[0].from, found[0].to);
    expect(at).toBe("^{2}");
    expect(found[0].message).toContain("^(2)");
  });

  it("flags _{...} subscript braces", () => {
    const text = "$ a_{ij} $";
    const found = findTypstLatexisms(text);
    expect(found).toHaveLength(1);
    expect(text.slice(found[0].from, found[0].to)).toBe("_{ij}");
    expect(found[0].message).toContain("_(ij)");
  });

  it("does NOT flag ^{...} outside math (literal text)", () => {
    expect(findTypstLatexisms("plain x^{2} text")).toHaveLength(0);
  });

  it("flags \\frac{a}{b} and suggests (a)/(b)", () => {
    const text = "$ \\frac{a}{b} $";
    const found = findTypstLatexisms(text);
    expect(found).toHaveLength(1);
    expect(text.slice(found[0].from, found[0].to)).toBe("\\frac{a}{b}");
    expect(found[0].message).toContain("(a)/(b)");
  });

  it("flags \\sqrt{x}", () => {
    const found = findTypstLatexisms("$ \\sqrt{x + 1} $");
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain("sqrt(x + 1)");
  });

  it("flags a generic backslash command but not \\frac/\\sqrt twice", () => {
    const found = findTypstLatexisms("$ \\alpha + \\frac{1}{2} $");
    // One generic (\alpha) + one frac — \frac must not be double-counted.
    expect(found).toHaveLength(2);
    const messages = found.map((f) => f.message).join("\n");
    expect(messages).toContain("alpha");
    expect(messages).toContain("(1)/(2)");
  });

  it("ignores escaped \\$ and unmatched braces gracefully", () => {
    expect(findTypstLatexisms("price is \\$5 and x^2")).toHaveLength(0);
    expect(findTypstLatexisms("$ x^{ $")).toHaveLength(0); // no closing brace
  });

  it("returns multiple findings sorted by position", () => {
    const found = findTypstLatexisms("$ y^{2} $ and $ z_{0} $");
    expect(found).toHaveLength(2);
    expect(found[0].from).toBeLessThan(found[1].from);
  });
});
