/**
 * BibliographyService
 *
 * Service for bibliography-related editor operations.
 */

import type { EditorView } from "@codemirror/view";
import {
  buildDuplicateResolutionChanges,
  findEntryByKey,
  parseBibEntriesWithRanges,
  type BibDuplicateGroup,
  type DuplicateResolutionAction,
  type SourceChange,
} from "./BibDuplicateService";
import { buildStyleEdit, findBibliographyCall } from "../lib/bibliographyCall";

export class BibliographyService {
  constructor(private getView: () => EditorView | null) {}

  /**
   * Insert a citation at the current cursor position
   * @param key Citation key
   * @returns true if successful, false if no editor view available
   */
  insertCitation(key: string): boolean {
    const view = this.getView();
    if (!view) return false;

    const text = `#cite(<${key}>)`;
    const pos = view.state.selection.main.head;

    view.dispatch(
      view.state.update({
        changes: { from: pos, insert: text },
        selection: { anchor: pos + text.length },
      })
    );

    view.focus();
    return true;
  }

  /**
   * Set the citation style of the `#bibliography(...)` call in the currently
   * active editor. Replaces an existing `style:` value or inserts one. Goes
   * through CodeMirror so the change keeps undo history and autosave.
   *
   * @param style Built-in style name (e.g. "ieee") or a `.csl` path.
   * @returns "ok" on success, "no-call" when the active file has no
   *   `#bibliography(...)`, "no-view" when no editor is focused.
   */
  setBibliographyStyle(style: string): "ok" | "no-call" | "no-view" {
    const view = this.getView();
    if (!view) return "no-view";

    const source = view.state.doc.toString();
    const call = findBibliographyCall(source);
    if (!call) return "no-call";

    const edit = buildStyleEdit(source, call, style);
    view.dispatch(
      view.state.update({
        changes: { from: edit.from, to: edit.to, insert: edit.insert },
        selection: { anchor: edit.from + edit.insert.length },
        scrollIntoView: true,
      })
    );

    view.focus();
    return "ok";
  }

  /**
   * Append a BibTeX/Hayagriva entry to the end of the currently active
   * bibliography file. Goes through the editor view (not the file API) so
   * the change participates in undo history and the existing autosave
   * pipeline picks it up like any other typed change.
   *
   * Caller is responsible for ensuring the active editor is a .bib / .yml
   * file — the hint banner is only mounted when that's true.
   *
   * @param entrySource The raw BibTeX (or Hayagriva) entry text.
   * @returns true if appended, false if no editor view available.
   */
  appendEntry(entrySource: string): boolean {
    const view = this.getView();
    if (!view) return false;

    const trimmedEntry = entrySource.trim();
    if (!trimmedEntry) return false;

    const docLength = view.state.doc.length;
    const docText = view.state.doc.toString();
    // Ensure a blank line separates the new entry from existing content.
    // Empty doc → no leading newline; doc ending in "\n\n" → none either.
    let prefix = "";
    if (docLength > 0) {
      if (docText.endsWith("\n\n")) prefix = "";
      else if (docText.endsWith("\n")) prefix = "\n";
      else prefix = "\n\n";
    }
    const insertText = `${prefix}${trimmedEntry}\n`;

    view.dispatch(
      view.state.update({
        changes: { from: docLength, insert: insertText },
        selection: { anchor: docLength + insertText.length },
        scrollIntoView: true,
      })
    );

    view.focus();
    return true;
  }

  replaceEntry(key: string, entrySource: string): boolean {
    const view = this.getView();
    if (!view) return false;

    const entry = findEntryByKey(view.state.doc.toString(), key);
    if (!entry) return false;

    const replacement = preserveTrailingBreak(entry.source, entrySource.trim());
    view.dispatch(
      view.state.update({
        changes: {
          from: entry.range.from,
          to: entry.range.to,
          insert: replacement,
        },
        selection: { anchor: entry.range.from + replacement.length },
        scrollIntoView: true,
      })
    );

    view.focus();
    return true;
  }

  replaceEntryAtIndex(index: number, entrySource: string): boolean {
    const view = this.getView();
    if (!view) return false;

    const entry = parseBibEntriesWithRanges(view.state.doc.toString()).entries.find(
      (item) => item.index === index
    );
    if (!entry) return false;

    const replacement = preserveTrailingBreak(entry.source, entrySource.trim());
    view.dispatch(
      view.state.update({
        changes: {
          from: entry.range.from,
          to: entry.range.to,
          insert: replacement,
        },
        selection: { anchor: entry.range.from + replacement.length },
        scrollIntoView: true,
      })
    );

    view.focus();
    return true;
  }

  removeEntry(key: string): boolean {
    return this.removeEntries([key]);
  }

  removeEntries(keys: string[]): boolean {
    const view = this.getView();
    if (!view || keys.length === 0) return false;

    const keySet = new Set(keys);
    const entries = parseBibEntriesWithRanges(view.state.doc.toString()).entries.filter(
      (entry) => keySet.has(entry.key)
    );
    if (entries.length === 0) return false;

    this.dispatchChanges(
      entries.map((entry) => ({
        from: entry.range.from,
        to: entry.range.to,
        insert: "",
      }))
    );
    return true;
  }

  removeEntriesByIndex(indexes: number[]): boolean {
    const view = this.getView();
    if (!view || indexes.length === 0) return false;

    const indexSet = new Set(indexes);
    const entries = parseBibEntriesWithRanges(view.state.doc.toString()).entries.filter(
      (entry) => indexSet.has(entry.index)
    );
    if (entries.length === 0) return false;

    this.dispatchChanges(
      entries.map((entry) => ({
        from: entry.range.from,
        to: entry.range.to,
        insert: "",
      }))
    );
    return true;
  }

  applyDuplicateResolution(
    group: BibDuplicateGroup,
    action: DuplicateResolutionAction,
    options: { selectedKeys?: string[] } = {}
  ): boolean {
    const view = this.getView();
    if (!view) return false;

    const changes = buildDuplicateResolutionChanges(
      view.state.doc.toString(),
      group,
      action,
      options
    );
    if (changes.length === 0) return false;

    this.dispatchChanges(changes);
    return true;
  }

  private dispatchChanges(changes: SourceChange[]): void {
    const view = this.getView();
    if (!view) return;

    const sorted = changes.slice().sort((a, b) => a.from - b.from);
    view.dispatch(
      view.state.update({
        changes: sorted,
        scrollIntoView: true,
      })
    );
    view.focus();
  }
}

function preserveTrailingBreak(original: string, replacement: string): string {
  const suffix = original.endsWith("\n\n") ? "\n\n" : original.endsWith("\n") ? "\n" : "";
  return `${replacement}${suffix}`;
}
