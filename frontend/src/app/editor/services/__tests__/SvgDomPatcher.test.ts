import { describe, it, expect, beforeEach } from "vitest";
import { patchSvgContainer } from "../SvgDomPatcher";

function host(initial?: string): HTMLElement {
  const el = document.createElement("div");
  if (initial) el.innerHTML = initial;
  return el;
}

const page = (body: string, attrs = 'viewBox="0 0 100 200"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;

describe("patchSvgContainer", () => {
  let container: HTMLElement;
  beforeEach(() => {
    container = host();
  });

  it("replaces wholesale on first render (empty container)", () => {
    const stats = patchSvgContainer(container, page('<g data-tid="a"></g>'));
    expect(stats.mode).toBe("replaced");
    expect(container.querySelector('g[data-tid="a"]')).not.toBeNull();
  });

  it("reuses every node when nothing changed (identity preserved)", () => {
    const svg = page('<g data-tid="a"><text>x</text></g><g data-tid="b"></g>');
    container.innerHTML = svg;
    const before = container.querySelector('g[data-tid="a"]');
    const stats = patchSvgContainer(container, svg);
    expect(stats.mode).toBe("patched");
    expect(stats.created).toBe(0);
    expect(stats.removed).toBe(0);
    expect(stats.reused).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('g[data-tid="a"]')).toBe(before);
  });

  it("keeps untouched siblings when one group's tid changes", () => {
    container.innerHTML = page(
      '<g data-tid="p1"><g data-tid="t1"></g><g data-tid="t2"></g></g>',
    );
    const keep = container.querySelector('g[data-tid="t1"]');
    // Page tid changed (content hash) but t1 survives inside; t2 → t3.
    const stats = patchSvgContainer(
      container,
      page('<g data-tid="p2"><g data-tid="t1"></g><g data-tid="t3"></g></g>'),
    );
    expect(stats.mode).toBe("patched");
    // p1 paired positionally with p2 and recursed: t1 reused as the SAME node;
    // t2's node is recycled in place into t3 (attributes wholesale-replaced) —
    // no fresh node needed, which is even cheaper than create+remove.
    expect(container.querySelector('g[data-tid="t1"]')).toBe(keep);
    expect(container.querySelector('g[data-tid="t3"]')).not.toBeNull();
    expect(container.querySelector('g[data-tid="t2"]')).toBeNull();
    expect(stats.reused).toBeGreaterThanOrEqual(1);
  });

  it("reuses a tid-matched node but refreshes its attributes (transform)", () => {
    container.innerHTML = page('<g data-tid="a" transform="translate(0, 10)"></g>');
    const node = container.querySelector('g[data-tid="a"]');
    patchSvgContainer(
      container,
      page('<g data-tid="a" transform="translate(0, 99)"></g>'),
    );
    const after = container.querySelector('g[data-tid="a"]');
    expect(after).toBe(node);
    expect(after?.getAttribute("transform")).toBe("translate(0, 99)");
  });

  it("moves reordered tid groups without recreating them", () => {
    container.innerHTML = page('<g data-tid="a"></g><g data-tid="b"></g>');
    const a = container.querySelector('g[data-tid="a"]');
    const b = container.querySelector('g[data-tid="b"]');
    const stats = patchSvgContainer(
      container,
      page('<g data-tid="b"></g><g data-tid="a"></g>'),
    );
    const gs = container.querySelectorAll("g");
    expect(gs[0]).toBe(b);
    expect(gs[1]).toBe(a);
    expect(stats.created).toBe(0);
  });

  it("updates root svg attributes (viewBox growth)", () => {
    container.innerHTML = page('<g data-tid="a"></g>', 'viewBox="0 0 100 200"');
    patchSvgContainer(container, page('<g data-tid="a"></g>', 'viewBox="0 0 100 400"'));
    expect(container.firstElementChild?.getAttribute("viewBox")).toBe("0 0 100 400");
  });

  it("appends new style rules instead of replacing (grow-only resources)", () => {
    container.innerHTML = page(
      "<style>.a{fill:red}</style><defs><path id='g1'/></defs><g data-tid='a'></g>",
    );
    const defs = container.querySelector("defs");
    patchSvgContainer(
      container,
      page(
        "<style>.b{fill:blue}</style><defs><path id='g1'/></defs><g data-tid='a'></g>",
      ),
    );
    const css = container.querySelector("style")?.textContent ?? "";
    expect(css).toContain(".a{fill:red}");
    expect(css).toContain(".b{fill:blue}");
    expect(container.querySelector("defs")).toBe(defs);
  });

  it("keeps existing glyph defs when a diff frame ships them EMPTY", () => {
    // typst.ts merge frames elide already-known resources — an empty <defs>
    // means "nothing new", never "delete everything".
    container.innerHTML = page(
      "<defs class='glyph'><path id='glyph1'/></defs><g data-tid='a'></g>",
    );
    patchSvgContainer(
      container,
      page("<defs class='glyph'></defs><g data-tid='a'></g>"),
    );
    expect(container.querySelector("#glyph1")).not.toBeNull();
  });

  it("appends only NEW glyphs, deduped by id", () => {
    container.innerHTML = page(
      "<defs class='glyph'><path id='glyph1'/></defs><g data-tid='a'></g>",
    );
    patchSvgContainer(
      container,
      page(
        "<defs class='glyph'><path id='glyph1'/><path id='glyph2'/></defs><g data-tid='a'></g>",
      ),
    );
    const defs = container.querySelector("defs");
    expect(defs?.querySelectorAll("path").length).toBe(2);
    expect(defs?.querySelectorAll("#glyph1").length).toBe(1);
  });

  it("keeps a stub group's content when tid matches (diff reuse protocol)", () => {
    // Unchanged subtrees arrive as `<g data-tid=X data-reuse-from=X></g>`
    // stubs with NO children — tid equality must preserve the live subtree.
    container.innerHTML = page(
      '<g data-tid="pg1"><path d="M0 0"/><text>giữ nguyên</text></g>',
    );
    patchSvgContainer(
      container,
      page('<g data-tid="pg1" data-reuse-from="pg1"></g>'),
    );
    expect(container.querySelector("text")?.textContent).toBe("giữ nguyên");
  });

  it("never reuses nodes marked data-bad-equality", () => {
    container.innerHTML = page('<g data-tid="a" data-bad-equality="1"><text>old</text></g>');
    patchSvgContainer(
      container,
      page('<g data-tid="a" data-bad-equality="1"><text>new</text></g>'),
    );
    expect(container.querySelector("text")?.textContent).toBe("new");
  });

  it("falls back to replace on unusable input", () => {
    container.innerHTML = page('<g data-tid="a"></g>');
    const stats = patchSvgContainer(container, "not an svg at all");
    expect(stats.mode).toBe("replaced");
  });
});
