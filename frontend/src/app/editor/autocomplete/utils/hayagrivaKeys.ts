/**
 * Lightweight Hayagriva YAML citation key extractor.
 *
 * Uses the `yaml` npm package for safe parsing (tolerant of malformed
 * input via try/catch), then walks the keyed top-level map. We only need
 * `key + author + year + title` for autocomplete preview — never the full
 * Hayagriva entry shape.
 */

import { parse as parseYaml } from "yaml";
import type { CitationEntry } from "./bibKeys";

export function extractHayagrivaKeys(content: string): CitationEntry[] {
  if (!content) return [];
  let raw: unknown;
  try {
    raw = parseYaml(content);
  } catch {
    return [];
  }
  if (!isRecord(raw)) return [];

  const entries: CitationEntry[] = [];
  for (const [key, value] of Object.entries(raw)) {
    if (!isRecord(value)) continue;
    entries.push({
      key,
      detail: buildDetail(value),
      info: typeof value.title === "string" ? value.title : undefined,
    });
  }
  return entries;
}

function buildDetail(h: Record<string, unknown>): string | undefined {
  const author = pickAuthor(h.author);
  const year = pickYear(h.date);
  if (author && year) return `${author} ${year}`;
  return author ?? year;
}

function pickAuthor(value: unknown): string | undefined {
  if (typeof value === "string") return surname(value);
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (typeof first === "string") return surname(first);
    if (isRecord(first)) {
      const name = first.name ?? first["family-name"] ?? first.given;
      if (typeof name === "string") return surname(name);
    }
  }
  return undefined;
}

function surname(value: string): string {
  if (value.includes(",")) return value.split(",")[0].trim();
  const parts = value.trim().split(/\s+/);
  return parts[parts.length - 1];
}

function pickYear(value: unknown): string | undefined {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const m = value.match(/\b(19|20)\d{2}\b/);
    return m ? m[0] : undefined;
  }
  return undefined;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
