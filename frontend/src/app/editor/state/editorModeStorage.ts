import type { EditorMode } from "../types/visual";

const PREFIX = "tlu-editor.visualMode";

function key(projectId: string, path: string): string {
  return `${PREFIX}.${projectId}.${path}`;
}

export function getStoredMode(projectId: string, path: string): EditorMode {
  if (typeof window === "undefined") return "code";
  try {
    const v = window.localStorage.getItem(key(projectId, path));
    return v === "visual" ? "visual" : "code";
  } catch {
    return "code";
  }
}

export function setStoredMode(
  projectId: string,
  path: string,
  mode: EditorMode,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(projectId, path), mode);
  } catch {
    // localStorage full / disabled (Safari private mode) — silently ignore.
  }
}

export function clearStoredMode(projectId: string, path: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(projectId, path));
  } catch {
    // ignore
  }
}
