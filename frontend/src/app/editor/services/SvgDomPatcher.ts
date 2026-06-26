/**
 * In-place SVG DOM patching for the Canvas (SVG) preview
 * (spec: typst-incremental-preview Phase 2 / IP-10, design §P2.3).
 *
 * Rebuilt from the patching CONCEPTS in tinymist's typst-dom
 * (`references/tinymist/tools/typst-dom/src/typst-patch.mts` — keyed reuse by
 * `data-tid`, wholesale attribute replacement, origin-view reconciliation;
 * extract-logic-only per typst-reference-workflow). Simplified for our
 * per-page architecture:
 *
 *   - typst.ts SVG output keys content groups with `data-tid` (content hash).
 *     Equal tid ⇒ identical subtree ⇒ the live DOM node is reused as-is
 *     (only attributes refreshed — transforms move when layout shifts).
 *   - A `<g>` whose tid changed is recursed into (positional pairing), so an
 *     edited paragraph reuses its untouched sibling text runs.
 *   - Non-`<g>` children (defs/style/rect/…) pair positionally per tag and
 *     are replaced when their serialization differs.
 *   - Anything unexpected (parse failure, structure mismatch, missing tids)
 *     falls back to a wholesale innerHTML replace — never worse than the old
 *     behaviour.
 */

export interface PatchStats {
  mode: "replaced" | "patched";
  /** Live DOM nodes kept (tid match or identical serialization). */
  reused: number;
  /** Nodes imported fresh from the new SVG. */
  created: number;
  /** Old nodes dropped. */
  removed: number;
}

const BAD_EQUALITY_ATTR = "data-bad-equality";
const TID_ATTR = "data-tid";

/**
 * Patch `container`'s rendered SVG to match `nextSvg`. Returns what happened
 * so callers can log/inspect. Never throws — any internal error degrades to
 * a full innerHTML replace.
 */
export function patchSvgContainer(
  container: HTMLElement,
  nextSvg: string,
): PatchStats {
  const replaced = (): PatchStats => {
    container.innerHTML = nextSvg;
    return { mode: "replaced", reused: 0, created: 1, removed: 1 };
  };

  try {
    const prev = container.firstElementChild;
    if (!prev || prev.tagName.toLowerCase() !== "svg") return replaced();

    const scratch = container.ownerDocument.createElement("div");
    scratch.innerHTML = nextSvg;
    const next = scratch.firstElementChild;
    if (!next || next.tagName.toLowerCase() !== "svg") return replaced();

    const stats: PatchStats = { mode: "patched", reused: 0, created: 0, removed: 0 };
    patchAttributes(prev, next);
    patchChildren(prev, next, stats);
    return stats;
  } catch {
    return replaced();
  }
}

/** Wholesale attribute sync (typst-patch style): if ANY attribute differs,
 * clear and copy — cheaper and simpler than per-attribute diffing. */
function patchAttributes(prev: Element, next: Element): void {
  const prevAttrs = prev.attributes;
  const nextAttrs = next.attributes;
  if (prevAttrs.length === nextAttrs.length) {
    let same = true;
    for (let i = 0; i < nextAttrs.length; i++) {
      const a = nextAttrs[i];
      if (prev.getAttribute(a.name) !== a.value) {
        same = false;
        break;
      }
    }
    if (same) return;
  }
  while (prev.attributes.length > 0) {
    prev.removeAttribute(prev.attributes[0].name);
  }
  for (let i = 0; i < nextAttrs.length; i++) {
    const a = nextAttrs[i];
    prev.setAttribute(a.name, a.value);
  }
}

function isG(el: Element): boolean {
  return el.tagName.toLowerCase() === "g";
}

/**
 * Grow-only resource merge (typst-dom's patchSvgHeader concept): append the
 * next frame's NEW glyph/clip-path defs (deduped by id) or style rules into
 * the live element; an empty incoming element means "nothing new — keep".
 * Like the reference, resources are never garbage-collected within a session.
 */
function mergeResourceElement(prev: Element, next: Element, doc: Document): void {
  if (prev.tagName.toLowerCase() === "style") {
    const incoming = next.textContent ?? "";
    if (incoming && !(prev.textContent ?? "").includes(incoming)) {
      prev.textContent = (prev.textContent ?? "") + incoming;
    }
    return;
  }
  const existingIds = new Set<string>();
  for (const child of Array.from(prev.children)) {
    const id = child.getAttribute("id");
    if (id) existingIds.add(id);
  }
  for (const child of Array.from(next.children)) {
    const id = child.getAttribute("id");
    if (id) {
      if (existingIds.has(id)) continue;
      existingIds.add(id);
    }
    prev.appendChild(doc.importNode(child, true));
  }
}

function tidOf(el: Element): string | null {
  if (el.getAttribute(BAD_EQUALITY_ATTR) != null) return null;
  return el.getAttribute(TID_ATTR);
}

/**
 * Keyed reconciliation of element children.
 *
 * Matching order per next child:
 *   1. `<g data-tid>` → unused prev `<g>` with the same tid → reuse node.
 *   2. `<g>` without a tid match → next unused prev `<g>` in order → recurse
 *      (sub-tree reuse for the edited region's siblings).
 *   3. non-`<g>` → positional pair among same-tag prev children; reuse when
 *      the serialization is identical, otherwise import the new node.
 * Unmatched prev children are removed; final order comes from the next tree.
 */
function patchChildren(prev: Element, next: Element, stats: PatchStats): void {
  const doc = prev.ownerDocument;
  const prevChildren = Array.from(prev.children);
  const nextChildren = Array.from(next.children);

  // Index prev children: g's by tid (multimap), plus an ordered pool for
  // positional fallbacks (g's without usable tid pairing / non-g per tag).
  const byTid = new Map<string, Element[]>();
  const gPool: Element[] = [];
  const byTagPool = new Map<string, Element[]>();
  for (const child of prevChildren) {
    if (isG(child)) {
      const tid = tidOf(child);
      if (tid != null) {
        const list = byTid.get(tid);
        if (list) list.push(child);
        else byTid.set(tid, [child]);
      }
      gPool.push(child);
    } else {
      const tag = child.tagName.toLowerCase();
      const list = byTagPool.get(tag);
      if (list) list.push(child);
      else byTagPool.set(tag, [child]);
    }
  }
  const used = new Set<Element>();

  const takeByTid = (tid: string): Element | null => {
    const list = byTid.get(tid);
    while (list && list.length > 0) {
      const candidate = list.shift() as Element;
      if (!used.has(candidate)) return candidate;
    }
    return null;
  };
  const takeNextG = (): Element | null => {
    while (gPool.length > 0) {
      const candidate = gPool.shift() as Element;
      if (!used.has(candidate)) return candidate;
    }
    return null;
  };
  const takeByTag = (tag: string): Element | null => {
    const list = byTagPool.get(tag);
    while (list && list.length > 0) {
      const candidate = list.shift() as Element;
      if (!used.has(candidate)) return candidate;
    }
    return null;
  };

  const desired: Element[] = [];
  for (const nextChild of nextChildren) {
    if (isG(nextChild)) {
      const tid = tidOf(nextChild);
      const exact = tid != null ? takeByTid(tid) : null;
      if (exact) {
        used.add(exact);
        // Equal tid ⇒ identical content; only attrs (transform) may differ.
        patchAttributes(exact, nextChild);
        stats.reused++;
        desired.push(exact);
        continue;
      }
      const positional = takeNextG();
      if (positional) {
        used.add(positional);
        patchAttributes(positional, nextChild);
        patchChildren(positional, nextChild, stats);
        desired.push(positional);
        continue;
      }
      stats.created++;
      desired.push(doc.importNode(nextChild, true));
      continue;
    }

    const tag = nextChild.tagName.toLowerCase();
    const pair = takeByTag(tag);

    // Resource containers are APPEND-ONLY in typst.ts's diff protocol:
    // merge frames ship an EMPTY <defs>/<style> (nothing new) or one holding
    // only the NEWLY introduced glyphs/rules. Replacing the live element
    // would wipe every glyph the document already uses — merge instead.
    if (pair && (tag === "defs" || tag === "style")) {
      used.add(pair);
      mergeResourceElement(pair, nextChild, doc);
      stats.reused++;
      desired.push(pair);
      continue;
    }

    if (pair && pair.outerHTML === nextChild.outerHTML) {
      used.add(pair);
      stats.reused++;
      desired.push(pair);
    } else {
      if (pair) used.add(pair); // consumed slot — its node gets removed below
      stats.created++;
      desired.push(doc.importNode(nextChild, true));
    }
  }

  // Drop prev children that found no role in the next tree. (Positionally
  // consumed-but-different non-g pairs are in `used` but not in `desired` —
  // they must go too, so filter on membership in `desired`.)
  const keep = new Set(desired);
  for (const child of prevChildren) {
    if (!keep.has(child)) {
      child.remove();
      stats.removed++;
    }
  }

  // Origin-view reconciliation: walk the desired order and move/insert via
  // insertBefore (moves preserve node identity, like typst-patch's swap_in).
  for (let i = 0; i < desired.length; i++) {
    const node = desired[i];
    if (prev.children[i] !== node) {
      prev.insertBefore(node, prev.children[i] ?? null);
    }
  }
}
