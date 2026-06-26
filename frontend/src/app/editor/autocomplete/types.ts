/**
 * Types for the Typst autocomplete subsystem.
 *
 * Shape mirrors the LSP CompletionItem taxonomy used by tinymist
 * (`references/tinymist/crates/tinymist-query/src/completion/proto.rs`)
 * but trimmed to what a hand-curated JSON needs. The richer fields
 * (`displayName`, `aliases`, `boost`, `section`, `infoVi`) on
 * `EnumValueObject` let the popup match typst.app's UI — string values
 * wrapped in quotes, friendly names on the right, aliases like "ieee"
 * surfaced at the top of the list.
 */

export interface TypstStdlib {
  /** Typst language version this data targets. Sync manually with the
   * `@myriaddreamin/typst-ts-web-compiler` package version. */
  version: string;
  functions: TypstFunction[];
  types: TypstType[];
}

export interface TypstFunction {
  name: string;
  /** Category for sort/group: model / layout / math / text / visualize /
   * foundations / file-ops / set-show. */
  category?: string;
  /** One-line signature, e.g. `(path, style: str, full: bool)`. */
  detail: string;
  /** Vietnamese description shown in popup info tooltip. */
  info: string;
  /** Optional English fallback kept beside the Vietnamese info so code
   * reviewers can cross-check translations without leaving the file. */
  infoEn?: string;
  /** Optional LSP-style snippet template (e.g. `figure(${1:image("$2")}, caption: [$3])`).
   * When absent, completion inserts `name()` with the cursor positioned
   * inside the parens. */
  snippet?: string;
  /** Return type label rendered as a pill in the info tooltip header
   * (e.g. `content`, `none`, `str`, `array`). Mirrors tinymist's
   * `CompletionItemLabelDetails.detail` "(args) → ret" pattern but split
   * out so we can style the return part separately. */
  returns?: string;
  /** Optional Typst code example rendered as a code block in the info
   * tooltip. Use to show idiomatic usage for the most-used functions
   * (figure, table, bibliography, image, cite, …). */
  example?: string;
  params: TypstParam[];
}

export interface TypstParam {
  name: string;
  detail: string;
  info: string;
  infoEn?: string;
  required: boolean;
  /** Closed set of string values. v1 schema accepted `string[]`;
   * v2 expanded to `(string | EnumValueObject)[]` so individual
   * values can carry friendly names, aliases, sort boost, and section
   * grouping. Plain strings still work for sparse data without
   * friendly metadata. */
  enumValues?: EnumValue[];
}

export type EnumValue = string | EnumValueObject;

export interface EnumValueObject {
  /** Raw value that gets inserted into the source (without surrounding quotes). */
  value: string;
  /** Friendly display name shown in the popup's `detail` slot
   * (e.g. "American Anthropological Association"). */
  displayName?: string;
  /** Short aliases that should match this entry — typed `ieee` will match
   * the long CSL identifier. Aliases are surfaced as virtual options
   * pointing at the same `apply` value. */
  aliases?: string[];
  /** Vietnamese 1-line description. Shown in the rich info tooltip. */
  infoVi?: string;
  /** Sort priority — popup orders highest boost first. Common citation
   * styles (ieee/apa/mla/...) use 99 to pin them to the top.
   * CodeMirror adds `boost` to the fuzzy-match score, so a value of 99
   * dominates ranking when scores are close (empty prefix or short
   * partial matches). */
  boost?: number;
  /** Section header to group this entry under in the popup
   * (e.g. "Phổ biến", "Theo hiệp hội Hoa Kỳ"). CodeMirror renders one
   * header per unique value, in the order it first appears. */
  section?: string;
  /** Optional Typst code example rendered as a code block in the info
   * tooltip — useful for showing how a citation style produces output. */
  example?: string;
  /** True when the value is a Typst identifier/keyword (e.g. `ttb`, `auto`,
   * `top`), not a string literal. Identifier-typed values are inserted bare
   * even at value-slot positions where the default behaviour would wrap a
   * string in quotes. Without this flag, `stack(dir: |)` completion produces
   * `dir: "ttb"` — invalid Typst (the parser expects a `direction`, not a
   * string), which then derails syntax highlighting for the rest of the
   * document. `auto` and `none` are treated as identifiers automatically
   * regardless of this flag. */
  identifier?: boolean;
}

/** CodeMirror `Completion` extended with our custom `description` field
 * so `addToOptions` can render a Vietnamese hint as a 4th column in each
 * popup row without losing type-safety. CodeMirror itself allows arbitrary
 * fields on `Completion`, so this is a structural extension only. */
export interface TypstCompletionExtras {
  description?: string;
}

export interface TypstType {
  name: string;
  info: string;
  infoEn?: string;
}
