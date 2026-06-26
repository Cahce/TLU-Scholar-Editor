/**
 * Compile-session dirty tracking for the Typst worker
 * (spec: typst-incremental-preview Phase 2 / IP-8, design §P2.1).
 *
 * The worker used to `compiler.reset()` + re-add EVERY file on EVERY compile,
 * forcing a from-scratch recompile each keystroke. Keeping the WASM world
 * alive and re-adding only the files whose content changed lets Typst's
 * comemo memoisation reuse evaluation of untouched modules — the main
 * latency win for multi-chapter documents.
 *
 * This module is pure (no worker globals) so the decision logic is
 * unit-testable. Conservative-by-design: anything that could leave stale
 * state in the virtual filesystem (deleted/renamed files, root change,
 * fresh session) returns a 'full' plan — correctness first, speed second.
 */

export type SessionContent = string | Uint8Array;

export interface SessionPlan {
  /** 'full' → reset the compiler VFS and add everything; 'incremental' →
   * add only `changed` paths on top of the live session. */
  action: "full" | "incremental";
  /** Paths to (re-)add. For 'full' this is every path. */
  changed: string[];
  /** Snapshot to store as the session state once the adds succeed. */
  nextFiles: Map<string, string>;
}

/**
 * Content fingerprint. Strings get FNV-1a (fast, good dispersion for source
 * text). Binaries (images/fonts) can be multi-MB and rarely change, so they
 * use a structural fingerprint — length + first/last 16 bytes — instead of a
 * full scan per compile.
 */
export function contentHash(content: SessionContent): string {
  if (typeof content === "string") {
    let h = 0x811c9dc5;
    for (let i = 0; i < content.length; i++) {
      h ^= content.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return `s${content.length}:${(h >>> 0).toString(36)}`;
  }
  const n = content.byteLength;
  let head = 0;
  let tail = 0;
  for (let i = 0; i < Math.min(16, n); i++) head = (head * 31 + content[i]) >>> 0;
  for (let i = Math.max(0, n - 16); i < n; i++) tail = (tail * 31 + content[i]) >>> 0;
  return `b${n}:${head.toString(36)}:${tail.toString(36)}`;
}

/**
 * Decide how to bring the compiler VFS from `prevFiles` (last successful
 * session snapshot; null = no live session) to `files`.
 */
export function planSessionUpdate(
  prevFiles: Map<string, string> | null,
  prevRoot: string | null,
  files: Record<string, SessionContent>,
  root: string,
): SessionPlan {
  const nextFiles = new Map<string, string>();
  for (const [path, content] of Object.entries(files)) {
    nextFiles.set(path, contentHash(content));
  }

  const full: SessionPlan = {
    action: "full",
    changed: Object.keys(files),
    nextFiles,
  };

  if (!prevFiles || prevRoot !== root) return full;

  // A path present last session but missing now = delete/rename. The VFS
  // would keep serving the stale file — reset instead (correct over fast).
  for (const path of prevFiles.keys()) {
    if (!nextFiles.has(path)) return full;
  }

  const changed: string[] = [];
  for (const [path, hash] of nextFiles) {
    if (prevFiles.get(path) !== hash) changed.push(path);
  }
  return { action: "incremental", changed, nextFiles };
}
