import { describe, it, expect } from "vitest";
import {
  bareTextIsFormula,
  convertLatexText,
  looksLikeLatexMath,
  segmentMath,
} from "../latex-detect";

describe("looksLikeLatexMath", () => {
  it("detects common LaTeX commands", () => {
    expect(looksLikeLatexMath("\\frac{a}{b} + \\sum_{i=1}^n x_i")).toBe(true);
    expect(looksLikeLatexMath("$E = mc^2 \\cdot \\alpha$")).toBe(true);
    expect(looksLikeLatexMath("\\begin{pmatrix}1\\end{pmatrix}")).toBe(true);
  });

  it("ignores plain prose and Windows paths", () => {
    expect(looksLikeLatexMath("xin chào thế giới")).toBe(false);
    expect(looksLikeLatexMath("C:\\Users\\hoang\\file.txt")).toBe(false);
    expect(looksLikeLatexMath("giá $100 và $200")).toBe(false);
  });
});

describe("segmentMath", () => {
  it("splits prose, inline and display segments", () => {
    const segs = segmentMath("Cho $a+b$ và $$\\frac{x}{y}$$ xong.");
    expect(segs).toEqual([
      { kind: "text", value: "Cho " },
      { kind: "inline", value: "a+b" },
      { kind: "text", value: " và " },
      { kind: "display", value: "\\frac{x}{y}" },
      { kind: "text", value: " xong." },
    ]);
  });

  it("returns a single text segment when no delimiters", () => {
    expect(segmentMath("abc")).toEqual([{ kind: "text", value: "abc" }]);
  });
});

describe("bareTextIsFormula", () => {
  it("accepts a bare formula", () => {
    expect(bareTextIsFormula("\\frac{a}{b} + \\sqrt{x}")).toBe(true);
  });

  it("rejects prose containing a command", () => {
    expect(
      bareTextIsFormula(
        "Trong tài liệu này chúng ta sẽ dùng \\frac{a}{b} để biểu diễn phân số trong các chương sau",
      ),
    ).toBe(false);
  });
});

describe("convertLatexText (real tex2typst)", () => {
  it("converts delimited segments and keeps prose verbatim", async () => {
    const { converted, failures, successes } = await convertLatexText(
      "Cho $\\frac{a}{b}$ và $$\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$$ xong.",
    );
    expect(failures).toBe(0);
    expect(successes).toBe(2);
    expect(converted).toContain("Cho $");
    expect(converted).toContain("a/b");
    expect(converted).toContain("mat(1, 2; 3, 4)");
    expect(converted).toContain(" xong.");
    expect(converted).not.toContain("\\frac");
  });

  it("wraps a converted bare formula in $ … $", async () => {
    const { converted, successes } = await convertLatexText("\\alpha \\cdot \\sqrt{x^2}");
    expect(successes).toBe(1);
    expect(converted.startsWith("$ ")).toBe(true);
    expect(converted.endsWith(" $")).toBe(true);
    expect(converted).toContain("alpha");
    expect(converted).not.toContain("\\alpha");
  });

  it("leaves prose-like bare text untouched", async () => {
    const text =
      "Chúng ta sẽ dùng \\frac{a}{b} để biểu diễn phân số trong chương này nhé";
    const { converted, successes } = await convertLatexText(text);
    expect(successes).toBe(0);
    expect(converted).toBe(text);
  });
});
