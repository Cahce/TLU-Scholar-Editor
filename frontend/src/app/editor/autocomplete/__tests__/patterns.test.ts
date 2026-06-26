import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { typst } from "codemirror-lang-typst";
import { detectContext } from "../patterns";

/**
 * Helper: create an EditorState with the Typst language extension active and
 * place the cursor where `|` appears in the source. The `|` is stripped
 * before parsing so it doesn't affect the syntax tree.
 */
function mkState(source: string): { state: EditorState; pos: number } {
  const pos = source.indexOf("|");
  if (pos === -1) throw new Error("source must contain `|` cursor marker");
  const cleaned = source.slice(0, pos) + source.slice(pos + 1);
  const state = EditorState.create({
    doc: cleaned,
    extensions: [typst()],
  });
  return { state, pos };
}

describe("detectContext", () => {
  it("detects function-name after #", () => {
    const { state, pos } = mkState("#fig|");
    const ctx = detectContext(state, pos);
    expect(ctx.kind).toBe("function-name");
    if (ctx.kind === "function-name") {
      expect(ctx.prefix).toBe("fig");
    }
  });

  it("detects function-name with empty prefix right after #", () => {
    const { state, pos } = mkState("#|");
    const ctx = detectContext(state, pos);
    expect(ctx.kind).toBe("function-name");
  });

  it("detects citation-key inside #cite(<...>)", () => {
    const { state, pos } = mkState("#cite(<smith|>)");
    const ctx = detectContext(state, pos);
    expect(ctx.kind).toBe("citation-key");
    if (ctx.kind === "citation-key") {
      expect(ctx.prefix).toBe("smith");
    }
  });

  it("detects label-ref after @ in markup", () => {
    const { state, pos } = mkState("Some text @sec|tion-intro");
    const ctx = detectContext(state, pos);
    expect(ctx.kind).toBe("label-ref");
    if (ctx.kind === "label-ref") {
      expect(ctx.prefix).toBe("sec");
    }
  });

  it("does not treat email @ as label-ref", () => {
    const { state, pos } = mkState("contact me@example|.com");
    const ctx = detectContext(state, pos);
    expect(ctx.kind).not.toBe("label-ref");
  });

  it("returns none inside line comment", () => {
    const { state, pos } = mkState("// #fig|");
    const ctx = detectContext(state, pos);
    expect(ctx.kind).toBe("none");
  });

  it("returns none inside math equation", () => {
    const { state, pos } = mkState("$ a + b |$");
    const ctx = detectContext(state, pos);
    expect(ctx.kind).toBe("none");
  });

  it("returns none in plain markup with no trigger", () => {
    const { state, pos } = mkState("Just some plain text |here");
    const ctx = detectContext(state, pos);
    expect(ctx.kind).toBe("none");
  });

  it("returns none inside raw block", () => {
    const { state, pos } = mkState("`#code| inside raw`");
    const ctx = detectContext(state, pos);
    expect(ctx.kind).toBe("none");
  });

  it("function-name not triggered in middle of identifier", () => {
    const { state, pos } = mkState("abc#def|");
    // Previous char before # is `c` (identifier char) → skip
    const ctx = detectContext(state, pos);
    expect(ctx.kind).toBe("none");
  });
});
