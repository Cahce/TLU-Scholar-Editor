/**
 * Lightweight BibTeX key extractor.
 *
 * Only pulls enough information for autocomplete preview: citation key,
 * primary author surname, year, and short title. Does NOT validate or
 * round-trip — the project's backend already has a full parser for sync
 * purposes. Running a stripped-down regex parser keeps the frontend
 * footprint tiny and tolerant of malformed user input.
 */

export interface CitationEntry {
  key: string;
  /** Optional preview tag combining author + year (e.g. "Clark 1988"). */
  detail?: string;
  /** Optional title or longer description shown in the popup body. */
  info?: string;
}

const ENTRY_HEAD = /@\w+\s*\{\s*([^,\s]+)\s*,/g;
const FIELD = /(\w+)\s*=\s*(?:\{([^}]*)\}|"([^"]*)")/g;

export function extractBibKeys(content: string): CitationEntry[] {
  if (!content) return [];
  const entries: CitationEntry[] = [];
  ENTRY_HEAD.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = ENTRY_HEAD.exec(content))) {
    const key = match[1];
    if (!key) continue;
    // Scan fields until the matching close brace at the entry's outer level.
    const body = sliceEntryBody(content, ENTRY_HEAD.lastIndex);
    const fields = parseFields(body);
    entries.push({
      key,
      detail: buildDetail(fields),
      info: fields.title,
    });
  }
  return entries;
}

function sliceEntryBody(text: string, from: number): string {
  let depth = 1;
  for (let i = from; i < text.length; i++) {
    const ch = text.charAt(i);
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(from, i);
    }
  }
  return text.slice(from);
}

function parseFields(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  FIELD.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FIELD.exec(body))) {
    const name = m[1].toLowerCase();
    const value = (m[2] ?? m[3] ?? "").trim();
    if (value && !(name in out)) out[name] = value;
  }
  return out;
}

function buildDetail(fields: Record<string, string>): string | undefined {
  const author = pickFirstAuthor(fields.author);
  const year = pickYear(fields.year ?? fields.date);
  if (author && year) return `${author} ${year}`;
  return author ?? year;
}

function pickFirstAuthor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const first = value.split(/\s+and\s+/i)[0];
  if (!first) return undefined;
  const trimmed = first.trim();
  // "Last, First" → take "Last"; else take last word.
  if (trimmed.includes(",")) return trimmed.split(",")[0].trim();
  const parts = trimmed.split(/\s+/);
  return parts[parts.length - 1];
}

function pickYear(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const m = value.match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : undefined;
}
