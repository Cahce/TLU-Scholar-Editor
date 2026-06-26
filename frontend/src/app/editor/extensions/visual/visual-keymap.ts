import { EditorSelection, Prec } from "@codemirror/state";
import type { EditorState, ChangeSpec } from "@codemirror/state";
import { type EditorView, keymap } from "@codemirror/view";

import { atomicDecorationsField } from "./atomic-decorations";

const LIST_LINE_RE = /^(\s*)([-+]|\/)\s+(.*)$/;
// Matches an "empty" list item: just the marker with no content after.
const EMPTY_LIST_LINE_RE = /^(\s*)([-+]|\/)\s*$/;

function lineIsListItem(text: string): boolean {
  return LIST_LINE_RE.test(text) || EMPTY_LIST_LINE_RE.test(text);
}

/**
 * Enter inside a Typst list item:
 *   - line has content: insert newline + same indent + same marker
 *   - line is empty (just marker): strip the marker (exit list)
 *
 * Mirrors Overleaf's visual-keymap, adapted to Typst's `- / + / /` markers.
 */
function enterInList(view: EditorView): boolean {
  const { state } = view;
  // Read-only viewers can focus the editor and press Enter — keymap commands
  // bypass `editable: false`, so the readOnly facet must be checked here.
  if (state.readOnly) return false;
  const sel = state.selection.main;
  if (!sel.empty) return false;
  const line = state.doc.lineAt(sel.from);
  if (sel.from !== line.to) {
    // Only auto-continue when caret is at end of the line — match common
    // markdown editor convention to avoid surprising splits mid-text.
    return false;
  }

  const emptyMatch = line.text.match(EMPTY_LIST_LINE_RE);
  if (emptyMatch) {
    const indent = emptyMatch[1];
    // Nested empty marker → pop one indent level instead of exiting list
    // entirely so the user can build hierarchies fluently.
    if (indent.length >= 2) {
      const trimmedIndent = indent.slice(0, indent.length - 2);
      const newText = `${trimmedIndent}${emptyMatch[2]} `;
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: newText },
        selection: { anchor: line.from + newText.length },
      });
      return true;
    }
    // Top-level empty marker → exit list, leave a blank line.
    view.dispatch({
      changes: { from: line.from, to: line.to, insert: "" },
      selection: { anchor: line.from },
    });
    return true;
  }

  const match = line.text.match(LIST_LINE_RE);
  if (!match) return false;

  const indent = match[1];
  const marker = match[2];
  const newLine = `\n${indent}${marker} `;
  view.dispatch({
    changes: { from: sel.from, to: sel.from, insert: newLine },
    selection: { anchor: sel.from + newLine.length },
  });
  return true;
}

interface LineRange {
  fromLine: number;
  toLine: number;
}

function selectedLineRange(state: EditorState): LineRange {
  const sel = state.selection.main;
  return {
    fromLine: state.doc.lineAt(sel.from).number,
    toLine: state.doc.lineAt(sel.to).number,
  };
}

/**
 * Indent / outdent every list line that intersects the current selection.
 * Returning `false` when no list lines intersect lets the editor's default
 * Tab behaviour (insert tab / focus shift) take over.
 */
function shiftListIndent(view: EditorView, delta: 1 | -1): boolean {
  const { state } = view;
  if (state.readOnly) return false;
  const { fromLine, toLine } = selectedLineRange(state);
  const changes: ChangeSpec[] = [];

  for (let n = fromLine; n <= toLine; n++) {
    const line = state.doc.line(n);
    if (!lineIsListItem(line.text)) continue;
    if (delta > 0) {
      changes.push({ from: line.from, to: line.from, insert: "  " });
    } else {
      const leading = /^( +)/.exec(line.text)?.[1] ?? "";
      const remove = Math.min(2, leading.length);
      if (remove === 0) continue;
      changes.push({ from: line.from, to: line.from + remove, insert: "" });
    }
  }

  if (changes.length === 0) return false;

  const sel = state.selection.main;
  view.dispatch({
    changes,
    // Preserve the relative cursor offset after the shift. CM6 maps the
    // selection through the change set automatically when we pass a
    // selection range built from the original positions.
    selection: EditorSelection.range(sel.anchor, sel.head),
  });
  return true;
}

const indentList = (view: EditorView) => shiftListIndent(view, 1);
const outdentList = (view: EditorView) => shiftListIndent(view, -1);

/**
 * Find a currently-RENDERED block widget (table / figure / block math /
 * code block) covering the given line range. The decoration field only
 * contains widgets that are not revealed, so a hit means the lines are
 * hidden behind a widget right now.
 */
function blockWidgetRegionAt(
  state: EditorState,
  from: number,
  to: number,
): { from: number; to: number } | null {
  const value = state.field(atomicDecorationsField, false);
  if (!value) return null;
  let found: { from: number; to: number } | null = null;
  value.decorations.between(from, to, (rFrom, rTo, deco) => {
    const spec = deco.spec as { widget?: unknown; block?: boolean } | undefined;
    if (rTo > rFrom && spec?.widget != null && spec?.block) {
      found = { from: rFrom, to: rTo };
      return false;
    }
    return undefined;
  });
  return found;
}

/**
 * ArrowUp/ArrowDown next to a rendered block widget: step INTO its source
 * (auto-reveals via the selection-aware decoration rebuild) at the first
 * line (moving down) or last line (moving up), preserving the column. The
 * default vertical motion lands on the replaced range's edge at an
 * unpredictable position — this makes keyboard navigation through widgets
 * behave like moving through ordinary lines. Once inside the revealed
 * source, arrows are plain text navigation; moving past the region's edge
 * falls through to the default command, the selection leaves the lines and
 * the widget re-renders.
 */
function arrowIntoBlockWidget(view: EditorView, dir: -1 | 1): boolean {
  const { state } = view;
  const sel = state.selection.main;
  if (!sel.empty) return false;
  const curLine = state.doc.lineAt(sel.head);
  const targetNum = curLine.number + dir;
  if (targetNum < 1 || targetNum > state.doc.lines) return false;
  const target = state.doc.line(targetNum);
  const region = blockWidgetRegionAt(state, target.from, target.to);
  if (!region) return false;

  const entryLine =
    dir === 1 ? state.doc.lineAt(region.from) : state.doc.lineAt(region.to);
  const col = Math.min(sel.head - curLine.from, entryLine.length);
  view.dispatch({
    selection: { anchor: entryLine.from + col },
    scrollIntoView: true,
    userEvent: "select",
  });
  return true;
}

const arrowDownIntoWidget = (view: EditorView) => arrowIntoBlockWidget(view, 1);
const arrowUpIntoWidget = (view: EditorView) => arrowIntoBlockWidget(view, -1);

export const visualKeymap = Prec.high(
  keymap.of([
    { key: "Enter", run: enterInList },
    { key: "Tab", run: indentList },
    { key: "Shift-Tab", run: outdentList },
    { key: "ArrowDown", run: arrowDownIntoWidget },
    { key: "ArrowUp", run: arrowUpIntoWidget },
  ]),
);
