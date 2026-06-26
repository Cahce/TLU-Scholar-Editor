/**
 * useTypstSync — orchestrates the editor↔preview source mapping.
 *
 * Subscribes to:
 *   - `TypstSourceMapService` for fresh heading data (refreshed on each
 *     successful compile).
 *   - The `editor:cursorChanged` window event (dispatched by EditorPane after
 *     a throttled CodeMirror updateListener).
 *   - The `syncForward` / `syncReverse` settings.
 *
 * Exposes:
 *   - `highlightRegion` — `{page, yPt, height}` of the section currently
 *     containing the cursor, or `null` when forward sync is OFF / unknown.
 *     PreviewPane reads this to render a fading overlay.
 *   - `jumpFromPreviewClick(frame)` — invoked by PreviewPane click handlers in
 *     every preview mode (PDF / Canvas(PDF) / SVG); resolves the click frame
 *     location to the nearest anchor and dispatches `editor:jumpTo`. No-ops
 *     when reverse sync is OFF.
 *
 * No CodeMirror compartment is required: the editor listener is attached at
 * the EditorPane level so the hook stays decoupled from extension wiring.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  findActiveHeadingFromCursor,
  findAnchorFromClick,
  findSourcePosInProject,
  getSyncEntries,
  subscribeSyncEntries,
  type FrameLoc,
  type HeadingSyncEntry,
} from '../services/TypstSourceMapService';
import {
  getFollowTyping,
  getSyncForward,
  getSyncReverse,
  subscribeSettings,
} from '../state/previewSettings';
import { useEditorStore } from '../state/editorStore';

/** A region to highlight in the preview pane. */
export interface SyncHighlight {
  page: number;
  yPt: number;
  /** Coarse band height in pt — heading-anchored, default 16pt (~size-12 line). */
  heightPt: number;
}

/**
 * Where the preview should scroll after a TYPING edit (spec:
 * typing-latency-and-follow-preview US-3). `typingTick` increments per
 * keystroke burst so consumers can distinguish "new typing happened" from a
 * re-render with the same region.
 */
export interface FollowTarget {
  page: number;
  yPt: number;
  typingTick: number;
}

/** Detail of the `editor:cursorChanged` custom event. */
interface CursorChangedDetail {
  line: number;
  /** 'typing' when the debounce window contained a document edit. */
  cause?: 'typing' | 'selection';
  /** Source file the cursor is in — scopes heading resolution per file. */
  file?: string;
}

export function useTypstSync(): {
  highlightRegion: SyncHighlight | null;
  /** Non-null only when follow-typing is ON and a typing edit resolved to a
   * known region. PreviewPane scrolls the active canvas to it. */
  followTarget: FollowTarget | null;
  jumpFromPreviewClick: (frame: FrameLoc, opts?: { text?: string }) => void;
  /** True if the document has any sync data (UI uses this to enable affordances). */
  hasSyncData: boolean;
} {
  const [entries, setEntries] = useState<HeadingSyncEntry[]>(() => getSyncEntries());
  const [syncForward, setSyncForward] = useState<boolean>(() => getSyncForward());
  const [syncReverse, setSyncReverse] = useState<boolean>(() => getSyncReverse());
  const [followTyping, setFollowTyping] = useState<boolean>(() => getFollowTyping());
  const [highlightRegion, setHighlightRegion] = useState<SyncHighlight | null>(null);
  const [followTarget, setFollowTarget] = useState<FollowTarget | null>(null);
  // Monotonic across setting toggles — a tick number must never repeat, or a
  // consumer's "is this a new burst?" check could swallow the first scroll
  // after re-enabling the feature.
  const typingTickRef = useRef(0);

  // Refresh entries when the sync map publishes new data after compile.
  useEffect(() => subscribeSyncEntries(setEntries), []);

  // Track the user's syncForward / syncReverse / followTyping prefs.
  useEffect(
    () =>
      subscribeSettings(() => {
        setSyncForward(getSyncForward());
        setSyncReverse(getSyncReverse());
        setFollowTyping(getFollowTyping());
      }),
    [],
  );

  // Toggling a feature OFF must clear its residual state immediately:
  //   - a stale followTarget would keep auto-scrolling the preview on every
  //     compile (the scroll effects re-run when the frame updates);
  //   - a stale highlight band would stay painted forever (the handler only
  //     updates it while syncForward is ON).
  useEffect(() => {
    if (!followTyping) setFollowTarget(null);
  }, [followTyping]);
  useEffect(() => {
    if (!syncForward) setHighlightRegion(null);
  }, [syncForward]);

  // Forward sync: listen for cursor changes and project them onto the
  // current entries. The same resolved region feeds both the highlight band
  // (any cursor move, gated by syncForward) and the follow-typing scroll
  // target (typing only, gated by followTyping).
  useEffect(() => {
    if (!syncForward && !followTyping) {
      return;
    }
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<CursorChangedDetail>).detail;
      if (!detail || typeof detail.line !== 'number') return;
      const active = findActiveHeadingFromCursor(entries, detail.line, detail.file);
      if (!active) {
        if (syncForward) setHighlightRegion(null);
        return;
      }
      if (syncForward) {
        setHighlightRegion({
          page: active.page,
          yPt: active.yPt,
          // Heading bands are visually thin; use a generous fixed band so the
          // overlay is easy to spot at any zoom level.
          heightPt: 18,
        });
      }
      if (followTyping && detail.cause === 'typing') {
        typingTickRef.current += 1;
        setFollowTarget({
          page: active.page,
          yPt: active.yPt,
          typingTick: typingTickRef.current,
        });
      }
    };
    window.addEventListener('editor:cursorChanged', handler);
    return () => window.removeEventListener('editor:cursorChanged', handler);
  }, [entries, syncForward, followTyping]);

  // Reverse sync: callback for PreviewPane click handlers.
  const jumpFromPreviewClick = useCallback(
    (frame: FrameLoc, opts?: { text?: string }) => {
      if (!syncReverse) return;

      const state = useEditorStore.getState();
      const previewPath = state.previewPath;
      const anchor = findAnchorFromClick(entries, frame);

      let dest: { file: string; line: number; column: number } | null = null;

      // Precise (Canvas SVG): match the clicked visual line's text against
      // source. Scope the search so it can't wrong-jump into an unrelated file
      // — "no jump" is better than "wrong jump".
      if (opts?.text) {
        const typFiles = Object.values(state.files)
          .filter((f) => f.path.endsWith('.typ'))
          .map((f) => ({
            path: f.path,
            content: state.drafts[f.path]?.content ?? f.textContent ?? '',
          }))
          .filter((f) => f.content.length > 0);

        if (anchor) {
          // Inside a known section → search ONLY that section's file, from the
          // heading line down. Keeps chapter clicks out of the cover / other
          // chapters / `[1]` table cells.
          const scope = typFiles.filter((f) => f.path === anchor.file);
          dest = findSourcePosInProject(scope, opts.text, anchor.file, anchor.sourceLine);
        } else if (entries.length > 0) {
          // Heading map exists but the click is above the first heading (cover /
          // table of contents) → restrict to the previewed file; do NOT
          // global-search, so cover text can't jump into a chapter that merely
          // shares a few words.
          const scope = previewPath
            ? typFiles.filter((f) => f.path === previewPath)
            : [];
          dest = findSourcePosInProject(scope, opts.text, previewPath ?? undefined);
        } else {
          // No heading map (query failed / no headings) → global search so
          // multi-file projects still resolve.
          dest = findSourcePosInProject(typFiles, opts.text, previewPath ?? undefined);
        }
      }
      // Coarse fallback: the clicked section's heading line.
      if (!dest && anchor) {
        dest = { file: anchor.file, line: anchor.sourceLine, column: 1 };
      }
      if (!dest) return;

      const { file, line, column } = dest;
      // Open the target file if needed, then dispatch right away: EditorPane
      // stashes the jump and applies it once that file's view is mounted, so a
      // cross-file jump lands on the first click (no "click 2-3 times").
      if (state.activePath !== file) {
        void state.setActivePath(file);
      }
      window.dispatchEvent(
        new CustomEvent('editor:jumpTo', { detail: { file, line, column } }),
      );
    },
    [entries, syncReverse],
  );

  return {
    highlightRegion,
    followTarget,
    jumpFromPreviewClick,
    hasSyncData: entries.length > 0,
  };
}
