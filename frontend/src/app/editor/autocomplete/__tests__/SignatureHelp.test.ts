import { describe, it, expect } from "vitest";
import { getFunction } from "../stdlib";
import {
  walkArgs,
  detectActiveParam,
  type ArgSpan,
} from "../SignatureHelpExtension";

/**
 * Parse a test source like `#bibliography("p", style: "ie|ee")` — returns
 * the cleaned doc, the cursor offset (where `|` was), and the open-paren
 * offset of the outermost call. `walkArgs` is given `doc.length` as
 * `closeParen` and stops itself at the first unbalanced `)`.
 */
function parse(source: string): {
  doc: string;
  pos: number;
  openParen: number;
} {
  const cursor = source.indexOf("|");
  if (cursor < 0) throw new Error("source must contain `|` cursor marker");
  const doc = source.slice(0, cursor) + source.slice(cursor + 1);
  const openParen = doc.indexOf("(");
  return { doc, pos: cursor, openParen };
}

function resolve(source: string, fnName: string): number {
  const fn = getFunction(fnName);
  if (!fn) throw new Error(`stdlib function not found: ${fnName}`);
  const { doc, pos, openParen } = parse(source);
  const spans = walkArgs(doc, openParen, doc.length);
  return detectActiveParam(fn, spans, doc, pos);
}

describe("walkArgs", () => {
  it("treats string contents as opaque (commas inside strings don't split)", () => {
    const doc = `bibliography("p", title: "Hello, World", style: "x")`;
    const spans = walkArgs(doc, doc.indexOf("("), doc.length);
    expect(spans).toHaveLength(3);
    // Span 2 covers `title: "Hello, World"` — colon should land on the
    // top-level `:` between `title` and the quoted string, not anywhere
    // inside the string.
    const titleSpan = spans[1];
    expect(doc.slice(titleSpan.from, titleSpan.to)).toContain("title:");
    expect(titleSpan.colon).toBeGreaterThan(-1);
    expect(doc.charAt(titleSpan.colon)).toBe(":");
  });

  it("respects nested paren / bracket / brace depth", () => {
    // `(("a", "b"), style: "x")` — first arg is a tuple containing a
    // comma; outer scan must NOT split on that comma.
    const doc = `bibliography(("a", "b"), style: "x")`;
    const spans = walkArgs(doc, doc.indexOf("("), doc.length);
    expect(spans).toHaveLength(2);
  });

  it("records only the FIRST top-level colon in a span", () => {
    // Pathological: a string literal followed by a stray top-level `:`
    // would never be valid Typst, but the algorithm should still be
    // deterministic — first colon wins.
    const doc = `f(a: b: c)`;
    const spans = walkArgs(doc, doc.indexOf("("), doc.length);
    expect(spans).toHaveLength(1);
    // The first `:` (after `a`) is the recorded one.
    expect(doc.charAt(spans[0].colon)).toBe(":");
    expect(spans[0].colon).toBe(doc.indexOf(":"));
  });

  it("pushes a trailing span when the call has no closing paren yet", () => {
    const doc = `bibliography("p", style: `;
    const spans = walkArgs(doc, doc.indexOf("("), doc.length);
    expect(spans).toHaveLength(2);
    expect(spans[1].to).toBe(doc.length);
  });

  it("produces a single empty span for `name(`+cursor+`)`", () => {
    const doc = `bibliography()`;
    const spans = walkArgs(doc, doc.indexOf("("), doc.length);
    expect(spans).toHaveLength(1);
    expect(spans[0].from).toBe(spans[0].to);
    expect(spans[0].colon).toBe(-1);
  });
});

/**
 * For each requirement in the spec, one assertion that the returned
 * param index matches the expected one. Param order in stdlib JSON:
 *   bibliography: 0=path, 1=title, 2=full, 3=style
 *   cite        : 0=key,  1=supplement, 2=form, 3=style
 *   figure      : 0=body, 1=caption, 2=placement, 3=kind, ...
 */
describe("detectActiveParam", () => {
  it("R1: cursor in named-arg value resolves by name", () => {
    expect(resolve(`#bibliography("p", style: "ie|ee")`, "bibliography")).toBe(3);
  });

  it("R1 (end of value): cursor right after closing quote still resolves", () => {
    expect(resolve(`#bibliography("p", style: "ieee"|)`, "bibliography")).toBe(3);
  });

  it("R2: cursor in identifier with colon AHEAD resolves by name", () => {
    expect(resolve(`#bibliography("p", sty|le: "ieee")`, "bibliography")).toBe(3);
  });

  it("R2 (no colon yet): identifier-only span matching a param resolves by name", () => {
    // User has typed `style` but not yet `:`. Span has no colon, but the
    // trimmed text equals a known param → match by name.
    expect(resolve(`#bibliography("p", style|)`, "bibliography")).toBe(3);
  });

  it("R3: cursor right after `name:` (no value yet) resolves by name", () => {
    expect(resolve(`#cite(<k>, form:|)`, "cite")).toBe(2);
  });

  it("R4: cursor in positional first arg highlights param 0", () => {
    expect(resolve(`#bibliography("p|")`, "bibliography")).toBe(0);
  });

  it("R5: commas inside string literals do not break arg-boundary detection", () => {
    expect(
      resolve(
        `#bibliography("p", title: "Hello, World", style: "ie|ee")`,
        "bibliography",
      ),
    ).toBe(3);
  });

  it("R6: cursor just after `,` falls back to positional index of NEXT arg", () => {
    // After first comma, before the user has typed anything for arg 2.
    expect(resolve(`#bibliography("p",| )`, "bibliography")).toBe(1);
  });

  it("nested call: cursor inside `caption: [c]` of figure resolves to caption", () => {
    // figure params: 0=body, 1=caption — cursor inside [c] of caption named arg.
    expect(
      resolve(`#figure(image("x.png"), caption: [c|])`, "figure"),
    ).toBe(1);
  });

  it("array in named arg: tuple as path argument does not confuse later spans", () => {
    expect(
      resolve(`#bibliography(("a.bib", "b.bib"), style: "ie|ee")`, "bibliography"),
    ).toBe(3);
  });

  it("positional fallback when identifier-only span does NOT match any param", () => {
    // `sty` is not a known param name → fallback to positional index 1.
    expect(resolve(`#bibliography("p", sty|)`, "bibliography")).toBe(1);
  });
});
