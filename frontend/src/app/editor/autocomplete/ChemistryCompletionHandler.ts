/**
 * Chemistry completion source.
 *
 * Two behaviours:
 *  1. `#ce…` (function-name) → a snippet that scaffolds `#ce("")` AND ensures
 *     the whalogen import (so the PDF actually compiles).
 *  2. Inside `#ce("…|…")` (chem-formula) → token-level completion of common
 *     compounds + mhchem reaction operators.
 *
 * Typst has no `\ce{}`; this targets the `whalogen` package's `#ce(...)`.
 */

import {
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { detectContext } from "./patterns";
import {
  CHEM_OPERATORS,
  COMMON_CHEM_FORMULAS,
  WHALOGEN_IMPORT,
} from "../lib/chemistry";

export function chemistryCompletionSource(
  ctx: CompletionContext,
): CompletionResult | null {
  const c = detectContext(ctx.state, ctx.pos);

  // 1. `#ce` scaffold snippet (alongside any stdlib matches).
  if (c.kind === "function-name") {
    const p = c.prefix.toLowerCase();
    if (p.length === 0 || !"ce".startsWith(p)) return null;
    return {
      from: c.from,
      to: c.to,
      options: [
        {
          label: "ce",
          detail: "Công thức hoá học",
          info: 'Chèn #ce("…") (whalogen) và tự thêm import nếu thiếu',
          type: "function",
          boost: 50,
          apply: (view, _completion, from, to) => {
            const needImport = !view.state.doc
              .toString()
              .includes("@preview/whalogen");
            const importText = needImport ? `${WHALOGEN_IMPORT}\n` : "";
            const ceText = 'ce("")';
            const changes = needImport
              ? [
                  { from: 0, insert: importText },
                  { from, to, insert: ceText },
                ]
              : [{ from, to, insert: ceText }];
            // Cursor between the quotes, in the post-change document.
            const anchor = from + importText.length + ceText.length - 2;
            view.dispatch({ changes, selection: { anchor } });
          },
        },
      ],
    };
  }

  // 2. Inside `#ce("…")` — compounds + reaction operators.
  if (c.kind === "chem-formula") {
    return {
      from: c.from,
      to: c.to,
      validFor: /^[A-Za-z0-9]*$/,
      options: [
        ...COMMON_CHEM_FORMULAS.map((e) => ({
          label: e.label,
          detail: e.detail,
          type: "variable" as const,
        })),
        ...CHEM_OPERATORS.map((e) => ({
          label: e.label,
          detail: e.detail,
          type: "keyword" as const,
        })),
      ],
    };
  }

  return null;
}
