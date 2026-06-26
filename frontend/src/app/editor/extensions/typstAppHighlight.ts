/**
 * Extra Typst syntax color layered on top of `codemirror-lang-typst`'s built-in
 * highlight, to make path strings (the second half of `#include "…/x.typ"`)
 * visually distinct from comments.
 *
 * The language package's `TypstHighlightSytle` paints `comment` green and
 * leaves `string` at the editor default. Using a green for strings would
 * collide with the comment colour, so we pick a warm amber/brown — the
 * classic string-literal hue in most editor themes, clearly distinct from
 * both the green comments and the deeppink keywords.
 *
 * `Import` / `Include` keywords are intentionally left to the package's
 * default deeppink (via `tags.moduleKeyword`), so the only override is the
 * string colour. `Prec.high` ensures this wins over the package's bundled
 * `syntaxHighlighting(TypstHighlightSytle)`.
 */
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { Prec, type Extension } from "@codemirror/state";
import { tags } from "@lezer/highlight";

export const typstAppHighlight: Extension = Prec.high(
  syntaxHighlighting(
    HighlightStyle.define([
      // Path string (and other string literals) → warm amber, distinct from
      // the green comment colour bundled by codemirror-lang-typst.
      { tag: tags.string, color: "#a04500" },
    ]),
  ),
);
