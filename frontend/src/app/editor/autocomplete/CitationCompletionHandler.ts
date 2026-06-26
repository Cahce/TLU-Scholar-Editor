/**
 * Citation completion source.
 *
 * Reads citation keys from every `.bib`/`.yml`/`.yaml` file present in the
 * project store and surfaces them whenever the cursor is inside a
 * `#cite(<…|)` or a top-level `@…` reference (label case is handled by a
 * separate handler but the tinymist pattern keeps the two close).
 *
 * Cache: indexed by `path → { savedAt, entries }` so editing a long .bib
 * doesn't reparse on every keystroke. Invalidated when the editor store's
 * file/draft `lastSavedAt` changes (the cheapest signal we already have).
 */

import {
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { detectContext } from "./patterns";
import { useEditorStore } from "../state/editorStore";
import { isBibPath, detectBibFormat } from "../lib/bibFormat";
import { extractBibKeys } from "./utils/bibKeys";
import { extractHayagrivaKeys } from "./utils/hayagrivaKeys";
import type { CitationEntry } from "./utils/bibKeys";

interface CacheEntry {
  fingerprint: string;
  entries: CitationEntry[];
}

const cache = new Map<string, CacheEntry>();

export function citationCompletionSource(
  ctx: CompletionContext,
): CompletionResult | null {
  const c = detectContext(ctx.state, ctx.pos);
  if (c.kind !== "citation-key") return null;

  const entries = collectAllEntries();
  if (entries.length === 0) return null;

  return {
    from: c.from,
    to: c.to,
    validFor: /^[a-zA-Z0-9_-]*$/,
    options: entries.map((e) => ({
      label: e.key,
      detail: e.detail,
      info: e.info,
      type: "variable",
    })),
  };
}

function collectAllEntries(): CitationEntry[] {
  const { files, drafts } = useEditorStore.getState();
  const out: CitationEntry[] = [];
  const seen = new Set<string>();

  for (const file of Object.values(files)) {
    if (!isBibPath(file.path)) continue;
    const content =
      drafts[file.path]?.content ?? file.textContent ?? "";
    if (!content) continue;
    const fingerprint = `${content.length}:${drafts[file.path]?.lastSavedAt ?? file.lastEditedAt ?? ""}`;
    let cached = cache.get(file.path);
    if (!cached || cached.fingerprint !== fingerprint) {
      const fmt = detectBibFormat(file.path);
      const entries =
        fmt === "hayagriva"
          ? extractHayagrivaKeys(content)
          : extractBibKeys(content);
      cached = { fingerprint, entries };
      cache.set(file.path, cached);
    }
    for (const entry of cached.entries) {
      if (seen.has(entry.key)) continue;
      seen.add(entry.key);
      out.push(entry);
    }
  }
  return out;
}
