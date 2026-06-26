/**
 * TypstSourceMapService — coarse bidirectional sync between Typst source and
 * compiled output.
 *
 * Why "coarse": typst.ts 0.7.0-rc2 does not expose a click-coordinate
 * → source-span API. `getSourceLoc(path)` exists but takes a renderer-internal
 * `Uint32Array` path, not screen coordinates. To get something working today
 * we use `compiler.query({selector: 'heading'})` for output coordinates and
 * regex-parse the source for `^=+ ` patterns to get source line numbers,
 * then align the two arrays by ordinal index.
 *
 * Granularity is therefore **heading-level**, not per-character. In practice
 * this is what users want from a SyncTeX-like flow most of the time — jump
 * between sections — and matches the existing outline-navigation behaviour.
 *
 * Reference: TeXlyre's `LaTeXSourceMapService` (LaTeX-only, uses synctex
 * binary). We diverge because Typst has no synctex; we use `query`
 * introspection instead.
 *
 * The module also exports a tiny singleton store so `useTypstPreview` can
 * publish new heading data after each compile and `useTypstSync` can react
 * without those hooks needing to know about each other.
 */

import type { HeadingLocation, TypstPreviewClient } from './TypstPreviewClient';

/**
 * A heading entry merged from source-line parsing and compiler output query.
 * `sourceLine` is 1-based. Coordinates are pt (PDF points).
 */
export interface HeadingSyncEntry {
  /** Source file the `= heading` lives in (multi-file `#include` projects). */
  file: string;
  sourceLine: number;
  level: number;
  title: string;
  page: number;
  yPt: number;
}

/**
 * A click position in compiled-output space, normalised to document points
 * (pt) relative to the top-left of a page. Every preview mode produces this
 * shape (SVG via viewBox, Canvas(PDF)/PDF via the pdf.js page viewport) so a
 * single resolver works across all three tabs.
 */
export interface FrameLoc {
  /** 1-based page number. */
  page: number;
  /** Horizontal offset in pt from the page's top-left. */
  xPt: number;
  /** Vertical offset in pt from the page's top-left. */
  yPt: number;
}

/** A resolved source position for an editor jump (1-based line/column). */
export interface SourcePos {
  file: string;
  line: number;
  column: number;
}

/**
 * A heading parsed from the user's source text. Pre-merge form.
 */
interface SourceHeading {
  file: string;
  sourceLine: number;
  level: number;
  title: string;
}

const HEADING_RE = /^(=+)\s+(.+?)\s*$/;

/**
 * Parse Typst source for top-level `= heading` markers.
 *
 * Skips lines inside fenced code blocks (` ``` `) so heading-looking text in
 * literal blocks is ignored. Does NOT attempt to ignore raw inline backticks
 * — those rarely span a line anyway.
 *
 * Returns entries in source order, which mirrors how `compiler.query`
 * returns headings — that ordinal alignment is what lets us cross-reference.
 */
export function parseSourceHeadings(source: string, file = ''): SourceHeading[] {
  const lines = source.split(/\r\n|\r|\n/);
  const out: SourceHeading[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const trimmed = line.replace(/^\s+/, '');
    const m = HEADING_RE.exec(trimmed);
    if (!m) continue;
    const equals = m[1];
    const title = m[2];
    if (!trimmed.startsWith(equals + ' ')) continue;
    out.push({
      file,
      sourceLine: i + 1,
      level: equals.length,
      title,
    });
  }
  return out;
}

/** Normalise a heading title for matching: strip simple emphasis/raw markup
 * (`*_\``) and collapse whitespace so `= *Intro*` matches rendered "Intro". */
function normalizeHeadingTitle(s: string): string {
  return s.replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Pair each rendered heading (carrying its resolved page/y) to the source
 * heading it came from, matched by heading **level + normalized title** rather
 * than ordinal index.
 *
 * Why identity matching: the compiled output contains headings that have no
 * `= ` line in the source — most notably `#outline(title: …)` block titles —
 * so a positional zip would drift after the first such heading and send clicks
 * to the wrong line. Source matches are consumed in document order so repeated
 * identical titles still pair left-to-right. Output headings with no source
 * match (outline titles, or headings living in `#include`-d files) are skipped.
 */
export function mergeSyncEntries(
  sourceHeadings: SourceHeading[],
  outputHeadings: HeadingLocation[],
): HeadingSyncEntry[] {
  const usedSource = new Set<number>();
  const out: HeadingSyncEntry[] = [];
  for (const dst of outputHeadings) {
    const dstTitle = normalizeHeadingTitle(dst.body);
    let matchIdx = -1;
    for (let i = 0; i < sourceHeadings.length; i++) {
      if (usedSource.has(i)) continue;
      const src = sourceHeadings[i];
      if (src.level === dst.level && normalizeHeadingTitle(src.title) === dstTitle) {
        matchIdx = i;
        break;
      }
    }
    if (matchIdx === -1) continue;
    usedSource.add(matchIdx);
    const src = sourceHeadings[matchIdx];
    out.push({
      file: src.file,
      sourceLine: src.sourceLine,
      level: src.level,
      title: src.title,
      page: dst.page,
      yPt: dst.yPt,
    });
  }
  // findAnchorFromClick assumes document order (page asc, then y asc).
  out.sort((a, b) => a.page - b.page || a.yPt - b.yPt);
  return out;
}

/**
 * Forward sync: given an editor cursor line, find the heading whose source
 * line is the largest value `<= cursorLine`. That's the "active section".
 *
 * `file` scopes the search to the source file the cursor is actually in.
 * REQUIRED for correctness in multi-file projects: source lines are
 * per-file, so without the filter a cursor on line 5 of one chapter would
 * happily match a heading on line ≤5 of a completely different file (the
 * follow-typing scroll made this long-standing band bug very visible).
 * Omitted → legacy whole-project behaviour.
 *
 * Returns `null` when the cursor is above the file's first heading (or the
 * file has no headings at all).
 */
export function findActiveHeadingFromCursor(
  entries: ReadonlyArray<HeadingSyncEntry>,
  cursorLine: number,
  file?: string,
): HeadingSyncEntry | null {
  let candidate: HeadingSyncEntry | null = null;
  for (const entry of entries) {
    if (file !== undefined) {
      // Entries are sorted by DOCUMENT position (page, yPt), which only
      // coincides with source-line order within a single file — and not
      // even then if a file is included twice. Scan exhaustively and keep
      // the entry closest below the cursor; heading counts are tiny.
      if (entry.file !== file) continue;
      if (
        entry.sourceLine <= cursorLine &&
        (candidate == null || entry.sourceLine >= candidate.sourceLine)
      ) {
        candidate = entry;
      }
      continue;
    }
    if (entry.sourceLine <= cursorLine) {
      candidate = entry;
    } else {
      break; // legacy single-file behaviour
    }
  }
  return candidate;
}

/**
 * Reverse sync (coarse, heading-level): given a click frame location, find the
 * anchor the click belongs to — the entry at or above the click in document
 * order. Considers page first, then y. If no anchor fits on the clicked page
 * (click landed above its first heading), falls back to the last anchor on an
 * earlier page.
 *
 * `frame.xPt` is accepted as part of the unified click shape but not yet used
 * for selection — headings rarely collide on the same y. Finer, x-aware anchor
 * resolution is deferred to the precise SVG path (Phase 2 / getSourceLoc).
 *
 * Returns `null` when the click is above the very first anchor of the document.
 */
export function findAnchorFromClick(
  entries: ReadonlyArray<HeadingSyncEntry>,
  frame: FrameLoc,
): HeadingSyncEntry | null {
  let candidate: HeadingSyncEntry | null = null;
  for (const entry of entries) {
    if (entry.page > frame.page) break;
    if (entry.page === frame.page && entry.yPt > frame.yPt) continue;
    candidate = entry;
  }
  return candidate;
}

/** Strip simple emphasis/raw markup and collapse whitespace for text search. */
function normalizeForSearch(s: string): string {
  return s.replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
}

/** Lower-cased letter/number tokens, markup- and whitespace-normalized. */
function tokenize(s: string): string[] {
  return normalizeForSearch(s)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0);
}

/**
 * Longest run of consecutive `query` tokens that also appears consecutively in
 * `line` (token-level longest-common-substring). Returns the run length, its
 * start index in `line`, and the characters it spans. Both inputs are short
 * (a visual line vs a source line) so the DP is cheap.
 */
function longestTokenRun(
  query: string[],
  line: string[],
): { len: number; lineStart: number; chars: number } {
  let best = 0;
  let bestStart = 0;
  let prev = new Array<number>(line.length + 1).fill(0);
  for (let i = 1; i <= query.length; i++) {
    const cur = new Array<number>(line.length + 1).fill(0);
    for (let j = 1; j <= line.length; j++) {
      if (query[i - 1] === line[j - 1]) {
        cur[j] = prev[j - 1] + 1;
        if (cur[j] > best) {
          best = cur[j];
          bestStart = j - cur[j];
        }
      }
    }
    prev = cur;
  }
  let chars = 0;
  for (let k = bestStart; k < bestStart + best; k++) chars += line[k].length;
  return { len: best, lineStart: bestStart, chars };
}

/** A project source file searched for reverse-sync text matching. */
export interface SourceFile {
  path: string;
  content: string;
}

/**
 * Precise reverse sync (Canvas SVG): given the TEXT OF A RENDERED VISUAL LINE,
 * find the source line across ALL project files with the longest contiguous
 * token overlap, and return its file + 1-based line/column.
 *
 * typst.ts 0.7.x has no usable client-side span API (`getSourceLoc` is
 * unpopulated; `data-span` isn't on elements), so we match rendered text
 * against source text. Matching the *line* (not a single glyph run) with
 * token-overlap is deliberate: a citation renders as "[1]" (source is `@key`,
 * so "[1]" alone would wrongly hit a `[1]` table cell) and math renders as
 * glyphs absent from source — but the surrounding prose still overlaps the
 * correct source line strongly, so it wins. Searching every `.typ` file (not
 * just the previewed `main.typ`) is what makes multi-file `#include` projects
 * resolve into the right chapter.
 *
 * `preferredPath` (usually the previewed file) is searched first; a full-query
 * match there short-circuits. Requires ≥2 overlapping tokens (or one
 * distinctive ≥5-char token) so it never jumps on a lone "[1]"/number.
 */
export function findSourcePosInProject(
  files: ReadonlyArray<SourceFile>,
  lineText: string,
  preferredPath?: string,
  fromLine?: number,
): { file: string; line: number; column: number } | null {
  const query = tokenize(lineText);
  if (query.length === 0) return null;

  const ordered = preferredPath
    ? [...files].sort((a, b) =>
        a.path === preferredPath ? -1 : b.path === preferredPath ? 1 : 0,
      )
    : files;

  let best:
    | { file: string; line: number; column: number; len: number; chars: number }
    | null = null;

  for (const f of ordered) {
    const lines = f.content.split(/\r\n|\r|\n/);
    for (let i = 0; i < lines.length; i++) {
      // Section scope: in the preferred (section) file, ignore lines before the
      // clicked heading so content of earlier sections can't win.
      if (fromLine != null && f.path === preferredPath && i + 1 < fromLine) continue;
      const lineTokens = tokenize(lines[i]);
      if (lineTokens.length === 0) continue;
      const run = longestTokenRun(query, lineTokens);
      if (run.len === 0) continue;
      if (
        !best ||
        run.len > best.len ||
        (run.len === best.len && run.chars > best.chars)
      ) {
        const firstTok = lineTokens[run.lineStart];
        const col = lines[i].toLowerCase().indexOf(firstTok);
        best = {
          file: f.path,
          line: i + 1,
          column: (col >= 0 ? col : 0) + 1,
          len: run.len,
          chars: run.chars,
        };
        // A full-query match (preferred file first, top-down) can't be beaten —
        // but only short-circuit once it clears the trivial-match threshold.
        if (run.len === query.length && (run.len >= 2 || run.chars >= 5)) {
          return { file: best.file, line: best.line, column: best.column };
        }
      }
    }
  }

  if (!best || (best.len < 2 && best.chars < 5)) return null;
  return { file: best.file, line: best.line, column: best.column };
}

// ============================================================================
// Singleton store — publishes the latest heading entries to interested hooks.
// ============================================================================

type SyncStoreListener = (entries: HeadingSyncEntry[]) => void;

let cachedEntries: HeadingSyncEntry[] = [];
const listeners = new Set<SyncStoreListener>();

/** Read current entries (synchronous). */
export function getSyncEntries(): HeadingSyncEntry[] {
  return cachedEntries;
}

/** Subscribe to updates; returns an unsubscribe function. */
export function subscribeSyncEntries(fn: SyncStoreListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function publishEntries(entries: HeadingSyncEntry[]): void {
  cachedEntries = entries;
  for (const l of listeners) {
    try {
      l(entries);
    } catch (err) {
      console.warn('[TypstSourceMapService] listener error:', err);
    }
  }
}

/**
 * Recompute and publish the sync map for the current document.
 *
 * Call this from `useTypstPreview` after each successful compile. We share
 * the existing `TypstPreviewClient` instance so the heading query runs on
 * the same worker / WASM module — no second compiler init.
 *
 * Silent on failure: source-map sync is a soft feature; if the query fails
 * we publish an empty list and the UI gracefully disables sync.
 */
export async function recomputeSyncMap(
  client: TypstPreviewClient,
  files: Record<string, string | Uint8Array>,
  mainFile: string,
  mainSource: string,
  root?: string,
  /**
   * compile-path → store-path translation (`CompilePathMapping.
   * diagnosticPathMap`). `files` arrive in COMPILE namespace (possibly
   * rebased), but every consumer of the entries — `setActivePath` in
   * reverse sync, the active-file filter in forward/follow sync — compares
   * against STORE paths. Without this, rebased projects resolve to paths
   * that don't exist in the store.
   */
  pathMap?: Record<string, string>,
): Promise<void> {
  try {
    const outputHeadings = await client.queryHeadings(files, mainFile, { root });
    // Parse `= ` headings from EVERY .typ file: multi-file `#include` projects
    // keep headings in chapter files, not `main.typ`. Each parsed heading is
    // tagged with its STORE file path so reverse-sync can scope clicks (and
    // forward/follow sync can scope the cursor) to the right file.
    const sourceHeadings: SourceHeading[] = [];
    for (const [path, content] of Object.entries(files)) {
      if (typeof content === 'string' && path.toLowerCase().endsWith('.typ')) {
        sourceHeadings.push(...parseSourceHeadings(content, pathMap?.[path] ?? path));
      }
    }
    const merged = mergeSyncEntries(sourceHeadings, outputHeadings);
    publishEntries(merged);
  } catch (err) {
    console.warn('[TypstSourceMapService] recompute failed:', err);
    publishEntries([]);
  }
}

/** Clear cached entries (e.g. when switching projects). */
export function clearSyncMap(): void {
  publishEntries([]);
}
