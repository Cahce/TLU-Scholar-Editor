/**
 * Typst autocomplete CodeMirror extension.
 *
 * Composes the four completion sources (stdlib, citation, label, file
 * path) into a single `autocompletion({ override: [...] })` extension
 * that EditorPane mounts after the Typst language support.
 *
 * UX upgrade — `compareCompletions` sorts by boost first so popular
 * picks (ieee/apa/a4/...) hover near the top regardless of alphabetical
 * order. Section headers come from each option's `section` field.
 * `tooltipClass` + `optionClass` hooks let `theme.css` style the popup
 * close to typst.app's look.
 *
 * Iteration 2: `addToOptions` injects a 4th column into each row that
 * renders the Vietnamese `description` field set by
 * `StdlibCompletionHandler`. Position 60 places it after `detail`
 * (default position 50) and before the optional info button (position
 * 70) — VSCode `labelDetails` layout.
 */

import { autocompletion } from "@codemirror/autocomplete";
import type { Extension } from "@codemirror/state";
import { stdlibCompletionSource } from "./StdlibCompletionHandler";
import { citationCompletionSource } from "./CitationCompletionHandler";
import { labelCompletionSource } from "./LabelCompletionHandler";
import { filePathCompletionSource } from "./FilePathCompletionHandler";
import { chemistryCompletionSource } from "./ChemistryCompletionHandler";
import type { TypstCompletionExtras } from "./types";
// Co-locate the popup CSS with the extension so any consumer that mounts
// `typstAutocompleteExtension()` automatically gets the theme. Vite injects
// the stylesheet on first import.
import "./theme.css";

/** Render the Vietnamese description column (4th cell per row). Returns
 * `null` when the completion has no description so CodeMirror keeps the
 * row tight. */
function renderDescription(
  completion: import("@codemirror/autocomplete").Completion,
): Node | null {
  const desc = (completion as TypstCompletionExtras).description;
  if (!desc) return null;
  const span = document.createElement("span");
  span.className = "cm-completionDescription";
  span.textContent = desc;
  return span;
}

export function typstAutocompleteExtension(): Extension {
  return autocompletion({
    override: [
      stdlibCompletionSource,
      chemistryCompletionSource,
      citationCompletionSource,
      labelCompletionSource,
      filePathCompletionSource,
    ],
    activateOnTyping: true,
    closeOnBlur: true,
    // Bumped from 50 → 80 so the full CSL style list (~81 entries) can
    // render in one popup when the user opens it deliberately.
    maxRenderedOptions: 80,
    defaultKeymap: true,
    selectOnOpen: true,
    tooltipClass: () => "tlu-completion-tooltip",
    optionClass: (c) => `tlu-opt-${c.type ?? "default"}`,
    addToOptions: [
      {
        // CodeMirror's default positions: icon 10, label 20, detail 50,
        // info button 70. 60 slots the description neatly between detail
        // and info — same visual rhythm VSCode uses for `labelDetails`.
        position: 60,
        render: renderDescription,
      },
    ],
    // No custom `compareCompletions` — CodeMirror's default sort already
    // does what we want: `score = fuzzy_match + boost * 100`, sort by
    // score desc, then section rank, then alphabetical. Overriding the
    // comparator scrambles section grouping AND lets non-matching items
    // float up when the prefix is empty. Use `boost` on individual
    // options (already done in the JSON) and let CodeMirror handle it.
  });
}
