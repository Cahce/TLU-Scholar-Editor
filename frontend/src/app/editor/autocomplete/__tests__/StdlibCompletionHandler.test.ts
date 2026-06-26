import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { type Completion, CompletionContext } from "@codemirror/autocomplete";
import { typst } from "codemirror-lang-typst";
import { stdlibCompletionSource } from "../StdlibCompletionHandler";

function makeContext(source: string): CompletionContext {
  const pos = source.indexOf("|");
  if (pos === -1) throw new Error("missing | cursor marker");
  const cleaned = source.slice(0, pos) + source.slice(pos + 1);
  const state = EditorState.create({
    doc: cleaned,
    extensions: [typst()],
  });
  return new CompletionContext(state, pos, true);
}

describe("stdlibCompletionSource", () => {
  it("returns function names after `#`", () => {
    const r = stdlibCompletionSource(makeContext("#fig|"));
    expect(r).not.toBeNull();
    if (!r) return;
    const figure = r.options.find((o) => o.label === "figure");
    expect(figure).toBeDefined();
    expect(figure?.type).toBe("function");
  });

  it("returns parameter names inside a known function call", () => {
    const r = stdlibCompletionSource(makeContext("#bibliography(sty|)"));
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.options.some((o) => o.label === "style")).toBe(true);
  });

  it("returns enum values inside `style:` string", () => {
    const r = stdlibCompletionSource(
      makeContext('#bibliography(style: "amer|")'),
    );
    expect(r).not.toBeNull();
    if (!r) return;
    const apa = r.options.some(
      (o) => o.label === "american-physics-society",
    );
    expect(apa).toBe(true);
    // All options should be marked as enum.
    expect(r.options.every((o) => o.type === "enum")).toBe(true);
  });

  it("returns null for plain markup with no trigger", () => {
    expect(stdlibCompletionSource(makeContext("Hello world |"))).toBeNull();
  });

  it("returns null inside a line comment", () => {
    expect(stdlibCompletionSource(makeContext("// fig|"))).toBeNull();
  });

  // ────────────────────────────────────────────────────────────────────────
  // UX upgrade — typst.app polish
  // ────────────────────────────────────────────────────────────────────────

  it("wraps enum string values with quotes in displayLabel", () => {
    const r = stdlibCompletionSource(
      makeContext('#bibliography(style: "amer|")'),
    );
    expect(r).not.toBeNull();
    if (!r) return;
    const apa = r.options.find(
      (o) => o.label === "american-physics-society",
    );
    expect(apa).toBeDefined();
    expect(apa?.displayLabel).toBe('"american-physics-society"');
    // apply removes quotes since the cursor sits inside a string literal.
    expect(apa?.apply).toBe("american-physics-society");
  });

  it("attaches displayName via `detail` for friendly enum entries", () => {
    const r = stdlibCompletionSource(
      makeContext('#bibliography(style: "ieee|")'),
    );
    if (!r) throw new Error("expected result");
    const ieee = r.options.find((o) => o.label === "ieee");
    expect(ieee?.detail).toBeDefined();
    // detail starts with a leading space for typst.app-style padding.
    expect(ieee?.detail?.trim()).toBe("IEEE");
  });

  it("boosts common picks (ieee/apa) above their alphabetical neighbours", () => {
    const r = stdlibCompletionSource(
      makeContext('#bibliography(style: "|")'),
    );
    if (!r) throw new Error("expected result");
    const ieee = r.options.find((o) => o.label === "ieee");
    const generic = r.options.find(
      (o) => o.label === "american-physics-society",
    );
    expect((ieee?.boost ?? 0)).toBeGreaterThan(generic?.boost ?? 0);
  });

  it("creates virtual alias options pointing at the same apply value", () => {
    const r = stdlibCompletionSource(
      makeContext('#bibliography(style: "|")'),
    );
    if (!r) throw new Error("expected result");
    // The CSL data lists `ieee` both as canonical value AND alias of the
    // long name. The handler must dedupe to a single option with apply "ieee".
    const ieeeOptions = r.options.filter((o) => o.apply === "ieee");
    expect(ieeeOptions.length).toBe(1);
  });

  it("renders rich info DOM for enum values that carry alias/displayName", () => {
    const r = stdlibCompletionSource(
      makeContext('#bibliography(style: "ieee|")'),
    );
    if (!r) throw new Error("expected result");
    const ieee = r.options.find((o) => o.label === "ieee");
    expect(typeof ieee?.info).toBe("function");
  });

  it("returns rich info function for every enum entry (fallback shows full identifier)", () => {
    // Earlier we omitted `info` for bare-string entries, but the hover
    // tooltip was then blank for those items. Now every enum option
    // emits a rich-info function — for bare strings it shows just the
    // canonical value, which is still useful when the popup truncates.
    const r = stdlibCompletionSource(
      makeContext('#bibliography(style: "|")'),
    );
    if (!r) throw new Error("expected result");
    const karger = r.options.find((o) => o.label === "karger");
    expect(typeof karger?.info).toBe("function");
  });

  it("value-slot context: cursor right after `:` shows enum values with auto-inserted quotes", () => {
    // typst.app behaviour: `style: |` shows `"ieee"`, `"apa"`, … with the
    // full quoted form so accepting the option inserts a complete string
    // literal in one step.
    const r = stdlibCompletionSource(makeContext("#bibliography(style: |)"));
    expect(r).not.toBeNull();
    if (!r) return;
    const ieee = r.options.find((o) => o.label === "ieee");
    expect(ieee).toBeDefined();
    // Apply must include both quotes — cursor has no surrounding string yet.
    expect(ieee?.apply).toBe('"ieee"');
    expect(ieee?.displayLabel).toBe('"ieee"');
  });

  it("value-slot context: works with extra whitespace after `:`", () => {
    const r = stdlibCompletionSource(
      makeContext("#bibliography(style:    |)"),
    );
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.options.length).toBeGreaterThan(0);
  });

  it("does not surface value-slot context when there is non-whitespace after `:`", () => {
    // `style: x|` — once the user starts typing something, value-slot is
    // no longer the right context; param-name or string-arg handlers
    // pick up depending on syntax.
    const r = stdlibCompletionSource(makeContext("#bibliography(style: x|)"));
    // The handler may return null (no recognised context) — what matters
    // is that we don't accidentally emit quote-wrapped enum values.
    if (r) {
      const sample = r.options.find((o) => o.apply === '"ieee"');
      expect(sample).toBeUndefined();
    }
  });

  it("ieee enum option carries boost 99 so it ranks high regardless of fuzzy score", () => {
    const r = stdlibCompletionSource(makeContext("#bibliography(style: |)"));
    if (!r) throw new Error("expected result");
    const ieee = r.options.find((o) => o.label === "ieee");
    expect(ieee?.boost).toBe(99);
  });

  it("enum options carry their `section` grouping header", () => {
    const r = stdlibCompletionSource(makeContext("#bibliography(style: |)"));
    if (!r) throw new Error("expected result");
    // `section` groups options under headers in the popup (the common
    // styles sit under "Phổ biến"). It coexists with `boost`: CodeMirror's
    // default sort keeps high-`boost` picks on top within their section, so
    // grouping does not bury ieee/apa — see TypstAutocompleteExtension.ts,
    // which deliberately keeps sections rather than overriding the
    // comparator. (`StdlibCompletionHandler.ts` copies `ev.section` through
    // from typst-stdlib.json onto each option.)
    const ieee = r.options.find((o) => o.label === "ieee");
    expect((ieee as { section?: unknown }).section).toBe("Phổ biến");
  });

  it("does not create duplicate options when alias equals canonical value", () => {
    // Earlier the JSON had `{ value: "ieee", aliases: ["ieee"] }` which
    // exercised the dedup path. The bug-fix removes the redundant alias,
    // but we keep this test to lock in the invariant: a single entry per
    // apply target, regardless of how the JSON is curated.
    const r = stdlibCompletionSource(
      makeContext('#bibliography(style: "|")'),
    );
    if (!r) throw new Error("expected result");
    const ieeeOpts = r.options.filter((o) => o.apply === "ieee");
    expect(ieeeOpts.length).toBe(1);
  });

  it("param-name completion shows detail with type signature", () => {
    const r = stdlibCompletionSource(makeContext("#bibliography(sty|)"));
    if (!r) throw new Error("expected result");
    const style = r.options.find((o) => o.label === "style");
    expect(style?.detail?.trim()).toBe("str");
    // `info` is now a function that builds the rich DOM tooltip (see
    // richInfo.ts) rather than a plain string. Invoke it and assert the
    // Vietnamese description lands in the shell's `.cm-info-desc` paragraph.
    expect(typeof style?.info).toBe("function");
    const dom = (style?.info as (c: Completion) => HTMLElement)(
      style as Completion,
    );
    expect(dom.querySelector(".cm-info-desc")?.textContent).toMatch(
      /Phong cách/,
    );
  });
});
