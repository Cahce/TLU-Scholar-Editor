import { syntaxTree } from "@codemirror/language";
import {
  type EditorState,
  type Extension,
  type Range,
  RangeSet,
  RangeValue,
  StateField,
} from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
} from "@codemirror/view";

import { NODE } from "./typst-node-names";
import {
  EnumNumberWidget,
  ListBulletWidget,
} from "./widgets/ListWidget";
import { CodeBlockWidget } from "./widgets/CodeBlockWidget";
import { MathWidget } from "./widgets/MathWidget";
import {
  buildFuncCallWidget,
  FUNC_CALL_WHITELIST,
} from "./widgets/FuncCallWidgets";
import { CitationWidget, LabelWidget } from "./widgets/CitationWidget";

function headingLevelForMarker(text: string): number {
  let count = 0;
  for (const ch of text) {
    if (ch === "=") count++;
    else break;
  }
  return Math.min(Math.max(count, 1), 6);
}

const CODE_FENCE_RE = /^```([a-zA-Z0-9_-]*)[\t ]*\r?\n([\s\S]*?)\r?\n?[\t ]*```$/;

function parseFencedRaw(raw: string): { lang: string | null; content: string } {
  const m = raw.match(CODE_FENCE_RE);
  if (!m) return { lang: null, content: raw };
  return { lang: m[1] || null, content: m[2] };
}

/**
 * Marker value used in the atomic-ranges RangeSet. We only care about
 * extents (so cursor nav can treat the range as a unit) — there's no
 * per-range data to attach, hence the empty value class.
 */
class AtomicMarker extends RangeValue {}
const ATOMIC = new AtomicMarker();

// ── Raw script / code-line styling (R5) ───────────────────────────────────
// Provided from THIS StateField (not a ViewPlugin): CodeMirror only accepts
// line decorations from a StateField, so emitting them from a plugin can
// break the whole visual layer at runtime. Pure `Decoration.line` (class
// only) — never replaces text.
const RAW_SCRIPT_LINE = Decoration.line({ class: "cm-typst-raw-script-line" });
const CODE_KEYWORD_RE =
  /^\s*#(let|set|show|import|include|if|else|for|while|return|context|break|continue)\b/;
const CODE_OPENER_RE = /^\s*#[{(]/;
const FUNC_CALL_LINE_RE = /^\s*#([a-zA-Z_][\w.-]*)\s*\(/;
// Funcs that already render as their own visual widgets — don't also paint
// their line as raw code.
const RAW_SCRIPT_VISUAL_FUNCS = new Set([
  "image",
  "figure",
  "table",
  "quote",
  "cite",
  "ce",
  "link",
]);
const RAW_SCRIPT_MAX_LINES = 20000;

function rawScriptBraceDelta(text: string): number {
  let d = 0;
  for (const ch of text) {
    if (ch === "{") d++;
    else if (ch === "}") d--;
  }
  return d;
}

/** Append `Decoration.line` for Typst logic lines (#let/#show/#{…}/custom calls). */
function pushRawScriptLines(
  state: EditorState,
  ranges: Range<Decoration>[],
): void {
  const doc = state.doc;
  if (doc.lines > RAW_SCRIPT_MAX_LINES) return;
  let braceDepth = 0;
  for (let n = 1; n <= doc.lines; n++) {
    const line = doc.line(n);
    const text = line.text;
    let isCode = false;
    if (braceDepth > 0) {
      isCode = true;
      braceDepth += rawScriptBraceDelta(text);
      if (braceDepth < 0) braceDepth = 0;
    } else if (CODE_KEYWORD_RE.test(text) || CODE_OPENER_RE.test(text)) {
      isCode = true;
      braceDepth = Math.max(0, rawScriptBraceDelta(text));
    } else {
      const m = FUNC_CALL_LINE_RE.exec(text);
      if (m && !RAW_SCRIPT_VISUAL_FUNCS.has(m[1])) isCode = true;
    }
    if (isCode) ranges.push(RAW_SCRIPT_LINE.range(line.from));
  }
}

export interface VisualDecorations {
  decorations: DecorationSet;
  atomicRanges: RangeSet<AtomicMarker>;
}

function buildDecorations(state: EditorState): VisualDecorations {
  const ranges: Range<Decoration>[] = [];
  const atomicRanges: Range<AtomicMarker>[] = [];
  const doc = state.doc;
  const sel = state.selection.main;

  /**
   * Register a plain replace decoration. Cursor can land inside the range,
   * which is what we want for widgets that support click-to-reveal source
   * (FuncCall, Equation, Raw block, Ref, Label). The selection-aware
   * `selIntersects` check below will hide the widget when cursor enters.
   */
  function pushReplace(
    from: number,
    to: number,
    spec: Parameters<typeof Decoration.replace>[0],
  ): void {
    ranges.push(Decoration.replace(spec).range(from, to));
  }

  /**
   * Register a replace decoration AND mark its range as atomic so cursor
   * navigation skips over it as a single unit. Use this ONLY for markers
   * that are always hidden and never need to be entered (HeadingMarker,
   * ListMarker, EnumMarker, TermMarker). CM6 will auto-adjust any
   * selection that lands inside an atomic range to lie outside, which
   * defeats click-to-reveal — so widgets meant to be entered must use
   * `pushReplace` instead.
   */
  function pushAtomicReplace(
    from: number,
    to: number,
    spec: Parameters<typeof Decoration.replace>[0],
  ): void {
    ranges.push(Decoration.replace(spec).range(from, to));
    if (to > from) atomicRanges.push(ATOMIC.range(from, to));
  }
  const seenHeadingLines = new Set<number>();
  // Per-parent EnumItem counters (keyed by parent.from).
  const enumCounters = new Map<number, number>();
  // EnumItem.from → assigned index (1-based) for downstream EnumMarker handler.
  const enumIndexByItem = new Map<number, number>();
  // ListItem/EnumItem/TermItem line decorations — track to avoid duplicates.
  const seenItemLines = new Set<number>();

  /**
   * Selection-aware widget gating (Overleaf / tinymist style "edit the source
   * where you are"), two-tier:
   *
   * - BLOCK widgets (table / figure / code block / display math) reveal when
   *   the cursor shares a LINE with their range (`selIntersects`) — you are
   *   either inside the block or not.
   * - INLINE widgets (links, citations, labels, inline math) reveal only when
   *   the selection TOUCHES their exact range (`selTouchesRange`, boundary
   *   inclusive). Line-based reveal for inline chips meant that merely moving
   *   the cursor through a paragraph exploded every chip on that line into
   *   raw markup — arrowing out of a code block onto the previous paragraph
   *   made its `#link(...)` source erupt mid-navigation.
   *
   * Boundary-inclusive matters for the typing flow: after typing `$x = y/8$`
   * the cursor sits at the end boundary; a strictly-inside check would hide
   * the just-typed source instantly. Touching counts as editing.
   */
  function selIntersects(from: number, to: number): boolean {
    const selFromLine = doc.lineAt(sel.from).number;
    const selToLine = doc.lineAt(sel.to).number;
    const regFromLine = doc.lineAt(from).number;
    const regToLine = doc.lineAt(to).number;
    return selFromLine <= regToLine && selToLine >= regFromLine;
  }

  function selTouchesRange(from: number, to: number): boolean {
    return sel.from <= to && sel.to >= from;
  }

  function applyItemLineDecoration(nodeFrom: number, className: string) {
    const line = doc.lineAt(nodeFrom);
    if (seenItemLines.has(line.from)) return;
    seenItemLines.add(line.from);
    ranges.push(
      Decoration.line({ class: className }).range(line.from),
    );
  }

  function endIncludingTrailingSpace(from: number, to: number): number {
    const line = doc.lineAt(from);
    return Math.min(to + 1, line.to);
  }

  try {
    syntaxTree(state).iterate({
      enter(node) {
        try {
        switch (node.name) {
          case NODE.HeadingMarker: {
            const markerText = doc.sliceString(node.from, node.to);
            const level = headingLevelForMarker(markerText);
            const line = doc.lineAt(node.from);
            if (!seenHeadingLines.has(line.from)) {
              seenHeadingLines.add(line.from);
              ranges.push(
                Decoration.line({
                  class: `cm-typst-heading cm-typst-heading-${level}`,
                  attributes: { "aria-label": `Heading level ${level}` },
                }).range(line.from),
              );
            }
            pushAtomicReplace(
              node.from,
              endIncludingTrailingSpace(node.from, node.to),
              {},
            );
            break;
          }

          case NODE.ListItem:
            applyItemLineDecoration(node.from, "cm-typst-list-item");
            break;

          case NODE.EnumItem: {
            const parent = node.node.parent;
            if (parent) {
              const next = (enumCounters.get(parent.from) ?? 0) + 1;
              enumCounters.set(parent.from, next);
              enumIndexByItem.set(node.from, next);
            }
            applyItemLineDecoration(node.from, "cm-typst-enum-item");
            break;
          }

          case NODE.TermItem:
            applyItemLineDecoration(node.from, "cm-typst-term-item");
            break;

          case NODE.ListMarker:
            pushAtomicReplace(
              node.from,
              endIncludingTrailingSpace(node.from, node.to),
              { widget: new ListBulletWidget("•") },
            );
            break;

          case NODE.EnumMarker: {
            const parent = node.node.parent;
            const idx = parent ? enumIndexByItem.get(parent.from) : undefined;
            if (idx != null) {
              pushAtomicReplace(
                node.from,
                endIncludingTrailingSpace(node.from, node.to),
                { widget: new EnumNumberWidget(idx) },
              );
            }
            break;
          }

          case NODE.TermMarker:
            pushAtomicReplace(
              node.from,
              endIncludingTrailingSpace(node.from, node.to),
              { widget: new ListBulletWidget("▸") },
            );
            break;

          case NODE.Raw: {
            // Multi-line Raw → block widget. Inline single-line Raw is
            // handled by mark-decorations.
            if (
              doc.lineAt(node.from).number === doc.lineAt(node.to).number
            ) {
              return undefined;
            }
            if (selIntersects(node.from, node.to)) return undefined;
            // block: true decorations must span complete lines.
            const blockFrom = doc.lineAt(node.from).from;
            const blockTo = doc.lineAt(node.to).to;
            const raw = doc.sliceString(node.from, node.to);
            const { lang, content } = parseFencedRaw(raw);
            // Click-to-reveal source for code-block editing → not atomic.
            pushReplace(blockFrom, blockTo, {
              widget: new CodeBlockWidget(
                content,
                lang,
                node.from + 1,
                node.from,
                node.to,
              ),
              block: true,
            });
            return false;
          }

          case NODE.Equation: {
            const raw = doc.sliceString(node.from, node.to);
            if (raw.length < 2 || raw[0] !== "$" || raw.at(-1) !== "$") {
              return undefined;
            }
            const inner = raw.slice(1, -1);
            // Typst convention: `$ ... $` (leading + trailing space)
            // means display math; `$...$` is inline.
            const isBlock =
              inner.length > 0 &&
              /^\s/.test(inner) &&
              /\s$/.test(inner);
            const revealed = isBlock
              ? selIntersects(node.from, node.to)
              : selTouchesRange(node.from, node.to);
            if (revealed) return undefined;
            const content = inner.trim();
            const fromPos = isBlock
              ? doc.lineAt(node.from).from
              : node.from;
            const toPos = isBlock ? doc.lineAt(node.to).to : node.to;
            // Click-to-reveal source for math editing → not atomic.
            pushReplace(fromPos, toPos, {
              widget: new MathWidget(
                content,
                isBlock,
                node.from + 1,
                node.from,
                node.to,
              ),
              block: isBlock,
            });
            return false;
          }

          case NODE.Ref: {
            const text = doc.sliceString(node.from, node.to);
            if (!text.startsWith("@")) return undefined;
            if (selTouchesRange(node.from, node.to)) return undefined;
            const citeKey = text.slice(1).trim();
            if (!citeKey) return undefined;
            // Click-to-reveal citation key for editing → not atomic.
            pushReplace(node.from, node.to, {
              widget: new CitationWidget(citeKey, node.from + 1, "ref"),
            });
            return false;
          }

          case NODE.Label: {
            const text = doc.sliceString(node.from, node.to);
            const m = text.match(/^<(.+)>$/);
            if (!m) return undefined;
            // A label that is a function argument (e.g. the key in
            // `#cite(<key>)`) is a citation key, NOT a standalone document
            // anchor — leave it to the cite widget / raw source instead of
            // painting it as a green "label" chip (which looked like a
            // citation and confused the two syntaxes).
            let anc = node.node.parent;
            let insideCall = false;
            while (anc) {
              if (anc.name === NODE.FuncCall) {
                insideCall = true;
                break;
              }
              anc = anc.parent;
            }
            if (insideCall) return undefined;
            if (selTouchesRange(node.from, node.to)) return undefined;
            // Click-to-reveal label name for editing → not atomic.
            pushReplace(node.from, node.to, {
              widget: new LabelWidget(m[1], node.from + 1),
            });
            return false;
          }

          case NODE.FuncCall: {
            // Only handle markup-mode `#funcname(...)` calls.
            if (
              node.from === 0 ||
              doc.sliceString(node.from - 1, node.from) !== "#"
            ) {
              return undefined;
            }
            const identChild = node.node.firstChild;
            if (!identChild || identChild.name !== NODE.Ident) {
              return undefined;
            }
            const funcName = doc.sliceString(identChild.from, identChild.to);
            if (!FUNC_CALL_WHITELIST.has(funcName)) return undefined;

            const callFrom = node.from - 1;
            const callTo = node.to;
            const rawCall = doc.sliceString(callFrom, callTo);
            // Pass `callFrom + 1` (strictly inside the widget) as the
            // jump-to-source target so clicking the widget body reveals
            // the source via selection-aware filtering.
            const built = buildFuncCallWidget(
              funcName,
              rawCall,
              callFrom + 1,
              callFrom,
              callTo,
            );
            if (!built) return undefined;
            // Reveal policy depends on the widget's display mode (see the
            // selIntersects/selTouchesRange docstring above).
            const revealed = built.block
              ? selIntersects(callFrom, callTo)
              : selTouchesRange(callFrom, callTo);
            if (revealed) return undefined;
            const fromPos = built.block
              ? doc.lineAt(callFrom).from
              : callFrom;
            const toPos = built.block ? doc.lineAt(callTo).to : callTo;
            // Click-to-reveal function-call source so user can edit args
            // inline (image path, table cells, etc.) → not atomic. The
            // pencil overlay remains the primary edit path.
            pushReplace(fromPos, toPos, {
              widget: built.widget,
              block: built.block,
            });
            return false;
          }

          default:
            break;
        }
        } catch (nodeErr) {
          console.warn(
            "[visual] node decoration failed:",
            node.name,
            nodeErr,
          );
        }
        return undefined;
      },
    });

    pushRawScriptLines(state, ranges);
  } catch (err) {
    console.warn("[visual] atomic decorations build failed:", err);
    return { decorations: Decoration.none, atomicRanges: RangeSet.empty };
  }

  return {
    decorations: Decoration.set(ranges, true),
    atomicRanges: RangeSet.of(atomicRanges, true),
  };
}

/**
 * StateField that holds atomic (replace) + line decorations. Block
 * decorations cannot live in a ViewPlugin, so the StateField is the only
 * legal home for `Decoration.replace({ block: true })`. Recomputed on doc
 * change or when the syntax tree updates (incremental parser may produce a
 * new tree without doc changes); idle transactions reuse the previous set.
 */
export const atomicDecorationsField = StateField.define<VisualDecorations>({
  create(state) {
    return buildDecorations(state);
  },
  update(value, tr) {
    // Doc change OR selection change both require a rebuild — selection
    // moves can flip widget visibility (Overleaf-style click-to-reveal).
    if (tr.docChanged || !tr.startState.selection.eq(tr.state.selection)) {
      return buildDecorations(tr.state);
    }
    const newTree = syntaxTree(tr.state);
    const oldTree = syntaxTree(tr.startState);
    if (newTree !== oldTree) {
      return buildDecorations(tr.state);
    }
    return value;
  },
  provide(field) {
    return [
      EditorView.decorations.from(field, (value) => value.decorations),
      // Cursor / selection navigation steps over hidden markers + widgets
      // as a single unit. We intentionally exclude line decorations from
      // this set (they're zero-width and don't need atomic semantics).
      EditorView.atomicRanges.from(field, (value) => () => value.atomicRanges),
    ];
  },
});

export const atomicDecorationsExt: Extension = atomicDecorationsField;
