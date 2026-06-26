/**
 * Stdlib completion: function names, parameter names, enum values.
 *
 * Pure mapping from `AutocompleteContext` to CodeMirror `CompletionResult`,
 * driven by the hand-curated `typst-stdlib.json`. The handler is sync —
 * stdlib data is module-static, so we never need to await anything.
 *
 * UX upgrades:
 * - Enum string values shown WITH surrounding quotes via `displayLabel`
 *   but matched against the raw value so fuzzy filter ignores the quote.
 * - Friendly `displayName` shows in `detail` next to the technical key.
 * - `boost` pins common picks (ieee/apa/mla/a4/...) to the top.
 * - `section` groups options by header in the popup.
 * - Aliases become virtual options pointing at the same `apply` value
 *   so typing "ieee" still selects the long CSL id when needed.
 * - Rich Vietnamese info renders as a small DOM tooltip via `richInfo.ts`.
 * - **Iteration 2**: Custom `apply` functions trigger `startCompletion`
 *   after function/param insertion so the next popup opens automatically
 *   (mirrors tinymist's `command: TriggerSuggest` LSP pattern).
 * - **Iteration 2**: A `description` field carries a short Vietnamese
 *   hint that `TypstAutocompleteExtension`'s `addToOptions` renders as a
 *   4th column in each row.
 */

import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  snippet,
  startCompletion,
} from "@codemirror/autocomplete";
import { detectContext } from "./patterns";
import { stdlib, getFunction } from "./stdlib";
import { renderEnumInfo, renderFunctionInfo, renderParamInfo } from "./richInfo";
import type {
  EnumValue,
  EnumValueObject,
  TypstCompletionExtras,
  TypstFunction,
  TypstParam,
} from "./types";

const IDENT_VALID = /^[a-zA-Z0-9_-]*$/;

/** Inline-row description max length. Short enough to fit beside the
 * function signature without dominating the row, long enough to be
 * useful at a glance. Longer text is truncated with `…`. */
const DESCRIPTION_MAX_CHARS = 72;

type TypstOption = Completion & TypstCompletionExtras;

export function stdlibCompletionSource(
  ctx: CompletionContext,
): CompletionResult | null {
  const c = detectContext(ctx.state, ctx.pos);

  switch (c.kind) {
    case "function-name": {
      const options: TypstOption[] = stdlib.functions.map((fn) => ({
        label: fn.name,
        detail: fn.detail,
        info: () => renderFunctionInfo(fn),
        type: "function",
        apply: makeFunctionApply(fn),
        description: shortDesc(fn.info),
      }));
      return { from: c.from, to: c.to, validFor: IDENT_VALID, options };
    }

    case "param-name": {
      const fn = getFunction(c.funcName);
      if (!fn || fn.params.length === 0) return null;
      const options: TypstOption[] = fn.params.map((p) => ({
        label: p.name,
        // typst.app renders "style str" — name with type to its right. We
        // achieve the same effect by prepending the param name in detail
        // (CodeMirror's `label` already shows once on the left).
        detail: ` ${p.detail}`,
        info: () => renderParamInfo(p),
        type: "property",
        apply: makeParamApply(p),
        boost: p.required ? 10 : 0,
        description: shortDesc(p.info),
      }));
      return { from: c.from, to: c.to, validFor: IDENT_VALID, options };
    }

    case "enum-value": {
      const fn = getFunction(c.funcName);
      const param = fn?.params.find((p) => p.name === c.paramName);
      if (!param?.enumValues) return null;
      return {
        from: c.from,
        to: c.to,
        validFor: IDENT_VALID,
        options: buildEnumOptions(param.enumValues, false),
      };
    }

    case "value-slot": {
      // Cursor sits right after `name:` with no value yet. Surface the
      // enum values as full `"…"` literals (typst.app screenshot of
      // `style: |` does exactly this).
      const fn = getFunction(c.funcName);
      const param = fn?.params.find((p) => p.name === c.paramName);
      if (!param?.enumValues) return null;
      return {
        from: c.from,
        to: c.to,
        // Allow `"`, letters/digits/hyphen — the popup stays open while
        // the user keeps typing inside the about-to-be-inserted string.
        validFor: /^["a-zA-Z0-9_-]*$/,
        options: buildEnumOptions(param.enumValues, true),
      };
    }

    default:
      return null;
  }
}

/* -------------------------------------------------------------------------
 * Apply helpers — control what's inserted and whether the next popup
 * opens automatically.
 * ---------------------------------------------------------------------- */

function makeFunctionApply(fn: TypstFunction) {
  return (
    view: import("@codemirror/view").EditorView,
    completion: Completion,
    from: number,
    to: number,
  ): void => {
    if (fn.snippet) {
      snippet(fn.snippet)(view, completion, from, to);
    } else {
      const inserted = `${fn.name}()`;
      view.dispatch({
        changes: { from, to, insert: inserted },
        // Place cursor inside the parens.
        selection: { anchor: from + fn.name.length + 1 },
      });
    }
    // Trigger suggest for parameter names — matches tinymist's
    // `command: TriggerSuggest` LSP pattern. `setTimeout(_, 0)` lets the
    // dispatch above settle into the editor before we open a new popup,
    // avoiding a race where CodeMirror dismisses the popup we just
    // opened.
    setTimeout(() => startCompletion(view), 0);
  };
}

function makeParamApply(p: TypstParam) {
  return (
    view: import("@codemirror/view").EditorView,
    _completion: Completion,
    from: number,
    to: number,
  ): void => {
    const inserted = `${p.name}: `;
    view.dispatch({
      changes: { from, to, insert: inserted },
      // Place cursor after the colon+space, where the value will go.
      selection: { anchor: from + inserted.length },
    });
    // If the param has a closed set of values, immediately suggest them
    // so the user picks one without typing. For free-form params the
    // user usually wants to type their own value, so we stay quiet.
    if (p.enumValues && p.enumValues.length > 0) {
      setTimeout(() => startCompletion(view), 0);
    }
  };
}

/* -------------------------------------------------------------------------
 * Enum option builders
 * ---------------------------------------------------------------------- */

function buildEnumOptions(values: EnumValue[], withQuotes: boolean): Completion[] {
  const out: Completion[] = [];
  const seenLabels = new Set<string>();

  for (const v of values) {
    const ev = normaliseEnumValue(v);
    if (!seenLabels.has(ev.value)) {
      seenLabels.add(ev.value);
      out.push(buildEnumOption(ev, ev.value, withQuotes));
    }
    // Virtual aliases — same apply, different label so the fuzzy filter
    // can match "ieee" → institute-of-electrical-… or vice versa. We
    // suppress duplicates so a value === alias case stays a single entry.
    for (const alias of ev.aliases ?? []) {
      if (seenLabels.has(alias)) continue;
      seenLabels.add(alias);
      out.push(buildEnumOption(ev, alias, withQuotes));
    }
  }
  return out;
}

function normaliseEnumValue(v: EnumValue): EnumValueObject {
  return typeof v === "string" ? { value: v } : v;
}

/**
 * `auto` and `none` are Typst keywords/identifiers no matter which param
 * they show up under (e.g. `figure(placement: auto)`, `image(format: auto)`).
 * Wrapping them in quotes is always wrong — `"auto"` becomes a string and
 * Typst reports a type error, which cascades and breaks downstream syntax
 * highlighting. Treat them as identifiers unconditionally.
 */
const ALWAYS_IDENTIFIER_VALUES = new Set(["auto", "none"]);

function isIdentifierValue(ev: EnumValueObject): boolean {
  return ev.identifier === true || ALWAYS_IDENTIFIER_VALUES.has(ev.value);
}

function buildEnumOption(
  ev: EnumValueObject,
  matchLabel: string,
  withQuotes: boolean,
): Completion {
  // Show the string with quotes — typst.app does this so the user can
  // tell at a glance the popup is offering string literals, not bare
  // identifiers. Insertion mode depends on where the cursor is:
  // - `withQuotes=false` (cursor already inside `"..."`): insert raw value.
  // - `withQuotes=true`  (cursor at value-slot, no quotes yet): insert
  //   the full `"value"` so the user gets a complete literal in one step,
  //   matching typst.app's behaviour at `style: |`.
  // Identifier-typed values (direction, alignment, `auto`, `none`, …) are
  // ALWAYS inserted bare and rendered bare in the popup — quoting them
  // would produce invalid Typst (`dir: "ttb"`) regardless of context.
  const isIdent = isIdentifierValue(ev);
  const quoted = `"${ev.value}"`;
  const displayLabel = isIdent ? ev.value : quoted;
  const applyText = isIdent ? ev.value : withQuotes ? quoted : ev.value;
  // Always render rich info so the hover tooltip works for every enum
  // entry, not just the ones with a friendly displayName. For bare CSL
  // strings (no displayName/infoVi) the tooltip still shows the full
  // identifier — handy when the popup truncates long names.
  const opt: TypstOption = {
    label: matchLabel,
    displayLabel,
    detail: ev.displayName ? ` ${ev.displayName}` : undefined,
    info: () => renderEnumInfo(ev),
    type: "enum",
    apply: applyText,
    boost: ev.boost ?? 0,
    description: ev.infoVi ? shortDesc(ev.infoVi) : undefined,
  };
  if (ev.section) {
    opt.section = ev.section;
  }
  return opt;
}

/* -------------------------------------------------------------------------
 * String helpers
 * ---------------------------------------------------------------------- */

/** Trim a long Vietnamese description to ~72 chars so it fits inline in
 * the popup row. Prefers cutting at the first sentence boundary; falls
 * back to a hard truncation with `…`. */
function shortDesc(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const trimmed = text.trim();
  if (trimmed.length <= DESCRIPTION_MAX_CHARS) return trimmed;

  // Prefer to end at a sentence boundary within the limit.
  const candidate = trimmed.slice(0, DESCRIPTION_MAX_CHARS);
  const lastPeriod = candidate.lastIndexOf(".");
  if (lastPeriod >= DESCRIPTION_MAX_CHARS * 0.4) {
    return candidate.slice(0, lastPeriod);
  }
  return `${candidate.trimEnd()}…`;
}
