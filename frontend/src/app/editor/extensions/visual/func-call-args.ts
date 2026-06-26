export interface ParsedArgs {
  positional: string[];
  named: Record<string, string>;
}

/**
 * Split a Typst function-call argument list (the text between the outer
 * parentheses) into positional + named args, respecting nested brackets and
 * string literals. Best-effort — gracefully degrades on malformed input.
 */
export function parseFuncCallArgs(src: string): ParsedArgs {
  const positional: string[] = [];
  const named: Record<string, string> = {};
  let depth = 0;
  let cur = "";
  let inString = false;
  let escape = false;

  function flush(): void {
    const trimmed = cur.trim();
    cur = "";
    if (!trimmed) return;
    const colonAt = findTopLevelColon(trimmed);
    if (colonAt !== -1) {
      const name = trimmed.slice(0, colonAt).trim();
      const value = trimmed.slice(colonAt + 1).trim();
      if (/^[A-Za-z_][\w-]*$/.test(name)) {
        named[name] = value;
        return;
      }
    }
    positional.push(trimmed);
  }

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (escape) {
      cur += ch;
      escape = false;
      continue;
    }
    if (ch === "\\") {
      cur += ch;
      escape = true;
      continue;
    }
    if (inString) {
      cur += ch;
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      cur += ch;
      inString = true;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      cur += ch;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth = Math.max(0, depth - 1);
      cur += ch;
      continue;
    }
    if (ch === "," && depth === 0) {
      flush();
      continue;
    }
    cur += ch;
  }
  flush();
  return { positional, named };
}

function findTopLevelColon(src: string): number {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (inString) {
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
    else if (ch === ":" && depth === 0) return i;
  }
  return -1;
}

/** Strip surrounding `"..."` from a string literal, returning the contents. */
export function unquoteString(src: string): string | null {
  const t = src.trim();
  if (t.length >= 2 && t[0] === '"' && t.at(-1) === '"') {
    return t.slice(1, -1);
  }
  return null;
}

/** Strip surrounding `[...]` from a Typst content block. */
export function unwrapContent(src: string): string | null {
  const t = src.trim();
  if (t.length >= 2 && t[0] === "[" && t.at(-1) === "]") {
    return t.slice(1, -1);
  }
  return null;
}

/**
 * Match `[#]funcName(...)` at the start of a snippet and return the args
 * body. Handles nested brackets so we can find the matching close. Accepts
 * both `#image(...)` (markup-context call) and `image(...)` (nested call,
 * e.g. inside `#figure(image(...))`).
 */
export function extractFuncCall(
  src: string,
  funcName: string,
): { args: string; rest: string } | null {
  let head: string;
  if (src.startsWith(`#${funcName}`)) head = `#${funcName}`;
  else if (src.startsWith(funcName)) head = funcName;
  else return null;
  let i = head.length;
  // Allow whitespace before `(`.
  while (i < src.length && /\s/.test(src[i])) i++;
  if (src[i] !== "(") return null;
  i++;
  const argStart = i;
  let depth = 1;
  let inString = false;
  let escape = false;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (escape) {
      escape = false;
      i++;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      i++;
      continue;
    }
    if (inString) {
      if (ch === '"') inString = false;
      i++;
      continue;
    }
    if (ch === '"') {
      inString = true;
      i++;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    if (depth === 0) break;
    i++;
  }
  if (depth !== 0) return null;
  return { args: src.slice(argStart, i), rest: src.slice(i + 1) };
}
