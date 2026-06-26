/**
 * BibTeX entry parser and duplicate helper with source ranges.
 *
 * This is intentionally editor-local: the backend has a pure duplicate
 * analyzer, but only the frontend has the exact CodeMirror document ranges
 * needed for undo-safe cleanup edits.
 */

export type DuplicateReason = "key" | "doi" | "title_author_year";
export type DuplicateResolutionAction =
  | "keep_first"
  | "keep_last"
  | "merge_fields"
  | "rename"
  | "delete_selected";

export interface BibSourceRange {
  from: number;
  to: number;
}

export interface ParsedBibEntry {
  key: string;
  type: string;
  fields: Record<string, string>;
  range: BibSourceRange;
  source: string;
  index: number;
}

export interface BibParseIssue {
  code: "malformed_entry" | "empty_key";
  message: string;
  from: number;
  to: number;
}

export interface BibDuplicateGroup {
  groupId: string;
  reasons: DuplicateReason[];
  entries: ParsedBibEntry[];
}

export interface BibAnalysisResult {
  entries: ParsedBibEntry[];
  issues: BibParseIssue[];
  duplicateGroups: BibDuplicateGroup[];
}

export interface SourceChange {
  from: number;
  to?: number;
  insert?: string;
}

const DEFAULT_REASONS: DuplicateReason[] = ["key", "doi", "title_author_year"];

export function analyzeBibSource(source: string): BibAnalysisResult {
  const { entries, issues } = parseBibEntriesWithRanges(source);
  return {
    entries,
    issues,
    duplicateGroups: analyzeBibDuplicates(entries),
  };
}

export function parseBibEntriesWithRanges(source: string): {
  entries: ParsedBibEntry[];
  issues: BibParseIssue[];
} {
  const entries: ParsedBibEntry[] = [];
  const issues: BibParseIssue[] = [];
  let index = 0;

  for (let pos = 0; pos < source.length; pos++) {
    if (source[pos] !== "@") continue;

    const header = /^@([A-Za-z][\w-]*)\s*([({])/.exec(source.slice(pos));
    if (!header) continue;

    const type = header[1].toLowerCase();
    const openChar = header[2];
    const closeChar = openChar === "{" ? "}" : ")";
    const openIndex = pos + header[0].length - 1;
    let cursor = openIndex + 1;
    while (/\s/.test(source[cursor] ?? "")) cursor++;

    const keyStart = cursor;
    while (
      cursor < source.length &&
      source[cursor] !== "," &&
      source[cursor] !== closeChar
    ) {
      cursor++;
    }
    const key = source.slice(keyStart, cursor).trim();
    const bodyStart = source[cursor] === "," ? cursor + 1 : cursor;
    const closeIndex = findMatchingClose(source, openIndex, openChar, closeChar);
    const rangeEnd = closeIndex >= 0 ? includeTrailingEntryBreak(source, closeIndex + 1) : source.length;
    const rawEntry = source.slice(pos, rangeEnd);

    if (!key) {
      issues.push({
        code: "empty_key",
        message: "Entry has an empty citation key.",
        from: keyStart,
        to: Math.min(cursor + 1, source.length),
      });
    }

    if (closeIndex < 0) {
      issues.push({
        code: "malformed_entry",
        message: "Entry is missing its closing brace.",
        from: pos,
        to: source.length,
      });
      break;
    }

    const body = source.slice(bodyStart, closeIndex);
    entries.push({
      key,
      type,
      fields: parseFields(body),
      range: { from: pos, to: rangeEnd },
      source: rawEntry,
      index,
    });
    index++;
    pos = rangeEnd - 1;
  }

  return { entries, issues };
}

export function analyzeBibDuplicates(
  entries: ParsedBibEntry[],
  reasons: DuplicateReason[] = DEFAULT_REASONS
): BibDuplicateGroup[] {
  const disjoint = new DisjointSet(entries.length);
  const reasonsByRoot = new Map<number, Set<DuplicateReason>>();

  for (const reason of reasons) {
    const buckets = bucketEntries(entries, reason);
    for (const bucket of buckets.values()) {
      if (bucket.length < 2) continue;
      for (let i = 1; i < bucket.length; i++) {
        disjoint.union(bucket[0], bucket[i]);
      }
    }
  }

  for (const reason of reasons) {
    const buckets = bucketEntries(entries, reason);
    for (const bucket of buckets.values()) {
      if (bucket.length < 2) continue;
      const root = disjoint.find(bucket[0]);
      const groupReasons = reasonsByRoot.get(root) ?? new Set<DuplicateReason>();
      groupReasons.add(reason);
      reasonsByRoot.set(root, groupReasons);
    }
  }

  const byRoot = new Map<number, ParsedBibEntry[]>();
  entries.forEach((entry, position) => {
    const root = disjoint.find(position);
    const group = byRoot.get(root) ?? [];
    group.push(entry);
    byRoot.set(root, group);
  });

  return Array.from(byRoot.entries())
    .filter(([root, groupEntries]) => groupEntries.length > 1 && reasonsByRoot.has(root))
    .map(([root, groupEntries]) => {
      const group = groupEntries.slice().sort((a, b) => a.index - b.index);
      const groupReasons = Array.from(reasonsByRoot.get(root) ?? []).sort();
      return {
        groupId: `${groupReasons.join("+")}:${group.map((entry) => `${entry.index}:${entry.key}`).join("|")}`,
        reasons: groupReasons,
        entries: group,
      };
    })
    .sort((a, b) => a.groupId.localeCompare(b.groupId));
}

export function findEntryByKey(source: string, key: string): ParsedBibEntry | null {
  return (
    parseBibEntriesWithRanges(source).entries.find((entry) => entry.key === key) ??
    null
  );
}

export function buildEntrySource(entry: ParsedBibEntry): string {
  return serializeEntry(entry.type, entry.key, entry.fields);
}

export function buildDuplicateResolutionChanges(
  source: string,
  group: BibDuplicateGroup,
  action: DuplicateResolutionAction,
  options: { selectedKeys?: string[] } = {}
): SourceChange[] {
  const currentEntries = parseBibEntriesWithRanges(source).entries;
  const currentByIndex = new Map(currentEntries.map((entry) => [entry.index, entry]));
  const entries = group.entries
    .map((entry) => currentByIndex.get(entry.index))
    .filter((entry): entry is ParsedBibEntry => Boolean(entry))
    .sort((a, b) => a.index - b.index);

  if (entries.length < 2) return [];

  if (action === "keep_first") {
    return removeEntries(entries.slice(1));
  }

  if (action === "keep_last") {
    return removeEntries(entries.slice(0, -1));
  }

  if (action === "delete_selected") {
    const selected = new Set(options.selectedKeys ?? []);
    return removeEntries(entries.filter((entry) => selected.has(entry.key)));
  }

  if (action === "rename") {
    const usedKeys = new Set(currentEntries.map((entry) => entry.key));
    return entries.slice(1).map((entry) => {
      usedKeys.delete(entry.key);
      const renamed = renameEntry(entry, uniqueKey(entry.key, usedKeys));
      usedKeys.add(renamed.key);
      return {
        from: entry.range.from,
        to: entry.range.to,
        insert: preserveEntryBreak(entry.source, buildEntrySource(renamed)),
      };
    });
  }

  const survivor = entries[0];
  const merged = entries.slice(1).reduce(mergeEntryFields, survivor);
  return [
    {
      from: survivor.range.from,
      to: survivor.range.to,
      insert: preserveEntryBreak(survivor.source, buildEntrySource(merged)),
    },
    ...removeEntries(entries.slice(1)),
  ];
}

export function applyChangesToSource(source: string, changes: SourceChange[]): string {
  return sortChangesDescending(changes).reduce((text, change) => {
    return `${text.slice(0, change.from)}${change.insert ?? ""}${text.slice(change.to ?? change.from)}`;
  }, source);
}

export function sortChangesDescending(changes: SourceChange[]): SourceChange[] {
  return changes.slice().sort((a, b) => b.from - a.from);
}

function findMatchingClose(
  source: string,
  openIndex: number,
  openChar: string,
  closeChar: string
): number {
  let depth = 0;
  let inQuote = false;
  let escaped = false;

  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (inQuote) continue;

    if (ch === openChar) depth++;
    if (ch === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function includeTrailingEntryBreak(source: string, end: number): number {
  let cursor = end;
  while (cursor < source.length && /[ \t\r]/.test(source[cursor])) cursor++;
  if (source[cursor] === "\n") cursor++;
  if (source[cursor] === "\n") cursor++;
  return cursor;
}

function parseFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const fieldPattern =
    /([A-Za-z][\w-]*)\s*=\s*({(?:[^{}]|\{[^{}]*\})*}|"(?:[^"\\]|\\.)*"|[^,\n]+)\s*,?/g;
  let match: RegExpExecArray | null;

  while ((match = fieldPattern.exec(body))) {
    fields[match[1].toLowerCase()] = cleanValue(match[2]);
  }

  return fields;
}

function cleanValue(value: string): string {
  const trimmed = value.trim().replace(/,$/, "").trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function bucketEntries(
  entries: ParsedBibEntry[],
  reason: DuplicateReason
): Map<string, number[]> {
  const buckets = new Map<string, number[]>();
  entries.forEach((entry, index) => {
    const key = duplicateKey(entry, reason);
    if (!key) return;
    const bucket = buckets.get(key) ?? [];
    bucket.push(index);
    buckets.set(key, bucket);
  });
  return buckets;
}

function duplicateKey(entry: ParsedBibEntry, reason: DuplicateReason): string | null {
  if (reason === "key") return entry.key.trim().toLowerCase() || null;
  if (reason === "doi") return normalizeDoi(entry.fields.doi);

  const title = normalizeText(entry.fields.title);
  const author = normalizeAuthor(entry.fields.author);
  const year = normalizeYear(entry.fields.year);
  if (!title || !author || !year) return null;
  return `${title}|${author}|${year}`;
}

function normalizeDoi(value?: string): string | null {
  if (!value) return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//, "")
    .replace(/^doi:\s*/, "")
    .replace(/\s+/g, "");
  return normalized || null;
}

function normalizeText(value?: string): string | null {
  if (!value) return null;
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[{}]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  return normalized || null;
}

function normalizeAuthor(value?: string): string | null {
  const firstAuthorRaw = value?.split(/\s+and\s+/i)[0]?.trim();
  if (!firstAuthorRaw) return null;
  if (firstAuthorRaw.includes(",")) {
    return normalizeText(firstAuthorRaw.split(",")[0]);
  }
  const firstAuthor = normalizeText(firstAuthorRaw);
  if (!firstAuthor) return null;
  return firstAuthor.split(" ").filter(Boolean).at(-1) ?? null;
}

function normalizeYear(value?: string): string | null {
  return value?.match(/\d{4}/)?.[0] ?? null;
}

function serializeEntry(
  type: string,
  key: string,
  fields: Record<string, string>
): string {
  const entries = Object.entries(fields).filter(([, value]) => value.trim());
  const maxKeyLen = entries.reduce((max, [field]) => Math.max(max, field.length), 0);
  const body = entries
    .map(([field, value], index) => {
      const pad = " ".repeat(maxKeyLen - field.length);
      const comma = index === entries.length - 1 ? "" : ",";
      return `  ${field}${pad} = {${value.trim()}}${comma}`;
    })
    .join("\n");
  return `@${type}{${key},\n${body}\n}`;
}

function preserveEntryBreak(original: string, replacement: string): string {
  const suffix = original.endsWith("\n\n") ? "\n\n" : original.endsWith("\n") ? "\n" : "";
  return `${replacement}${suffix}`;
}

function mergeEntryFields(
  survivor: ParsedBibEntry,
  incoming: ParsedBibEntry
): ParsedBibEntry {
  return {
    ...survivor,
    fields: {
      ...incoming.fields,
      ...survivor.fields,
    },
  };
}

function renameEntry(entry: ParsedBibEntry, key: string): ParsedBibEntry {
  return { ...entry, key };
}

function uniqueKey(baseKey: string, usedKeys: Set<string>): string {
  const cleaned = baseKey.trim() || "entry";
  let index = 2;
  let candidate = `${cleaned}_${index}`;
  while (usedKeys.has(candidate)) {
    index++;
    candidate = `${cleaned}_${index}`;
  }
  return candidate;
}

function removeEntries(entries: ParsedBibEntry[]): SourceChange[] {
  return entries.map((entry) => ({
    from: entry.range.from,
    to: entry.range.to,
    insert: "",
  }));
}

class DisjointSet {
  private readonly parents: number[];

  constructor(size: number) {
    this.parents = Array.from({ length: size }, (_, index) => index);
  }

  find(index: number): number {
    const parent = this.parents[index];
    if (parent === index) return index;
    const root = this.find(parent);
    this.parents[index] = root;
    return root;
  }

  union(a: number, b: number): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parents[rootB] = rootA;
    }
  }
}
