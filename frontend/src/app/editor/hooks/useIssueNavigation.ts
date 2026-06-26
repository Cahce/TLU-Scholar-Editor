import { useCallback, useEffect } from "react";

import { useEditorStore } from "../state/editorStore";
import { getDiagnosticSummary } from "../state/selectors";

// Shared navigation cursor across every hook instance. The global F8 handler
// (ProjectWorkspace) and the prev/next buttons (IssuesPanel) must agree on
// "where we are" in the issue list, so the cursor lives at module scope. It's
// ephemeral UI position — not persisted — and resets to -1 whenever the
// diagnostics set changes so the next jump starts from the first issue.
let navCursor = -1;

/**
 * Next/previous compile-issue navigation. Issues come from
 * `getDiagnosticSummary().orderedIssues` (severity → file → line), already
 * filtered to navigable diagnostics (those with a file + range). Jumping
 * switches the active file when needed and dispatches `editor:jumpTo`.
 */
export function useIssueNavigation(): {
  goNext: () => void;
  goPrev: () => void;
  count: number;
} {
  const setActivePath = useEditorStore((s) => s.setActivePath);
  const orderedIssues = useEditorStore(
    (s) => getDiagnosticSummary(s.diagnostics).orderedIssues,
  );

  // Reset position when the issue set changes (stable identity ⇒ no reset).
  useEffect(() => {
    navCursor = -1;
  }, [orderedIssues]);

  const jumpTo = useCallback(
    (index: number) => {
      const issue = orderedIssues[index];
      if (!issue) return;
      navCursor = index;
      void setActivePath(issue.file);
      window.dispatchEvent(
        new CustomEvent("editor:jumpTo", {
          detail: {
            line: issue.range.start.line,
            column: issue.range.start.column,
          },
        }),
      );
    },
    [orderedIssues, setActivePath],
  );

  const goNext = useCallback(() => {
    if (orderedIssues.length === 0) return;
    jumpTo((navCursor + 1) % orderedIssues.length);
  }, [orderedIssues, jumpTo]);

  const goPrev = useCallback(() => {
    if (orderedIssues.length === 0) return;
    jumpTo((navCursor - 1 + orderedIssues.length) % orderedIssues.length);
  }, [orderedIssues, jumpTo]);

  return { goNext, goPrev, count: orderedIssues.length };
}
