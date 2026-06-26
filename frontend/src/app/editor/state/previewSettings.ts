// Per-browser user preferences for editor / preview behaviour. Stored in
// localStorage so they survive page reloads but are not synced across devices.
// Future work: lift into per-user backend settings via /me preferences.

const KEY_OUTLINE_AUTOHIGHLIGHT = "tlu-outline-autohighlight";
const KEY_SVG_MODE = "tlu-preview-svg-mode";
const KEY_VIM_MODE = "tlu-editor-vim-mode";
const KEY_FORMAT_ON_SAVE = "tlu-editor-format-on-save";
const KEY_MATHLIVE = "tlu-editor-mathlive-enabled";
const KEY_SYNC_FORWARD = "tlu-editor-sync-forward";
const KEY_SYNC_REVERSE = "tlu-editor-sync-reverse";
const KEY_FOLLOW_TYPING = "tlu-preview-follow-typing";

const SETTINGS_CHANGED_EVENT = "tlu-editor-settings-changed";

// One-time migrations. Each migration flag is checked once at module load;
// after it has run we never touch the related setting again — so users who
// explicitly opt back in after the migration keep their choice.
const VIM_CURSOR_FIX_MIGRATION = "tlu-vim-cursor-fix-migration-v1";

/**
 * Silent localStorage migrations to recover users from accidental edge cases
 * introduced by earlier feature work.
 *
 * **vim-cursor-fix (v1)** — Phase 1 added a Vim keybindings toggle in
 * Settings. Some testers enabled it then forgot, which caused two visible
 * regressions on next F5:
 *   1. Normal-mode block cursor (Vim default `#ff9696` salmon) looked like
 *      a red alert.
 *   2. `Ctrl+V` in Normal mode is "Visual Block", not paste — so users
 *      could no longer paste with the standard shortcut.
 *
 * We flip Vim mode off exactly ONCE per browser so the editor behaves like
 * every other modern editor (Overleaf / TeXlyre / VSCode) by default.
 * Power users who actually want Vim can re-enable it from Settings; we set
 * the migration flag right after the write so we never undo their choice
 * on subsequent loads.
 */
function runOnceMigrations(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(VIM_CURSOR_FIX_MIGRATION) !== "done") {
      window.localStorage.setItem(KEY_VIM_MODE, "false");
      window.localStorage.setItem(VIM_CURSOR_FIX_MIGRATION, "done");
    }
  } catch {
    // private mode / quota / disabled storage — ignore
  }
}

runOnceMigrations();

export type SvgMode = "off" | "full" | "incremental";

function safeRead(key: string): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    // private mode / quota — ignore.
  }
}

function broadcastChange(key: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: { key } }));
}

// ---------------------------------------------------------------------------
// Outline auto-highlight
// ---------------------------------------------------------------------------
export function getOutlineAutoHighlight(): boolean {
  // Default ON — explicit 'false' string is the only way to disable.
  return safeRead(KEY_OUTLINE_AUTOHIGHLIGHT) !== "false";
}

export function setOutlineAutoHighlight(value: boolean): void {
  safeWrite(KEY_OUTLINE_AUTOHIGHLIGHT, String(value));
  broadcastChange(KEY_OUTLINE_AUTOHIGHLIGHT);
}

// ---------------------------------------------------------------------------
// SVG preview mode (off | full | incremental)
// ---------------------------------------------------------------------------
export function getSvgMode(): SvgMode {
  const v = safeRead(KEY_SVG_MODE);
  if (v === "off" || v === "full") return v;
  // Default = incremental: it's the single live preview surface now, so default
  // to the lightest path (reuses the render session + patches the DOM instead
  // of re-rendering the whole document every keystroke). Users who explicitly
  // picked 'off'/'full' keep their choice.
  return "incremental";
}

export function setSvgMode(mode: SvgMode): void {
  safeWrite(KEY_SVG_MODE, mode);
  broadcastChange(KEY_SVG_MODE);
}

// ---------------------------------------------------------------------------
// Vim mode toggle (default OFF). When ON, CodeMirror loads the @replit Vim
// extension via a compartment so the toggle applies live without remount.
// ---------------------------------------------------------------------------
export function getVimMode(): boolean {
  return safeRead(KEY_VIM_MODE) === "true";
}

export function setVimModePref(value: boolean): void {
  safeWrite(KEY_VIM_MODE, String(value));
  broadcastChange(KEY_VIM_MODE);
}

// ---------------------------------------------------------------------------
// Format-on-save (default OFF). When ON, the autosave hook runs typstyle on
// the active .typ buffer before persisting.
// ---------------------------------------------------------------------------
export function getFormatOnSave(): boolean {
  return safeRead(KEY_FORMAT_ON_SAVE) === "true";
}

export function setFormatOnSavePref(value: boolean): void {
  safeWrite(KEY_FORMAT_ON_SAVE, String(value));
  broadcastChange(KEY_FORMAT_ON_SAVE);
}

// ---------------------------------------------------------------------------
// MathLive inline math editor (default ON). When ON, cursor entering a Typst
// math region `$...$` shows a floating MathLive preview/edit popover.
// ---------------------------------------------------------------------------
export function getMathliveEnabled(): boolean {
  // Default ON — explicit 'false' string is the only way to disable.
  return safeRead(KEY_MATHLIVE) !== "false";
}

export function setMathliveEnabledPref(value: boolean): void {
  safeWrite(KEY_MATHLIVE, String(value));
  broadcastChange(KEY_MATHLIVE);
}

// ---------------------------------------------------------------------------
// SyncTeX-equivalent for Typst (Phase 4). Two independent toggles so power
// users can keep one direction enabled but not the other (e.g. silent forward
// sync only). Both default ON.
//   - syncForward: editor cursor → highlight section band in preview.
//   - syncReverse: click in preview → editor cursor jumps to heading line.
// Granularity is heading-level (typst.ts has no per-character source-map API
// for SVG / PDF output in 0.7.0-rc2).
// ---------------------------------------------------------------------------
export function getSyncForward(): boolean {
  return safeRead(KEY_SYNC_FORWARD) !== "false";
}
export function setSyncForwardPref(value: boolean): void {
  safeWrite(KEY_SYNC_FORWARD, String(value));
  broadcastChange(KEY_SYNC_FORWARD);
}

export function getSyncReverse(): boolean {
  return safeRead(KEY_SYNC_REVERSE) !== "false";
}
export function setSyncReversePref(value: boolean): void {
  safeWrite(KEY_SYNC_REVERSE, String(value));
  broadcastChange(KEY_SYNC_REVERSE);
}

// ---------------------------------------------------------------------------
// Follow-typing preview scroll (default ON). When ON, the preview pane
// auto-scrolls to the region containing the cursor after each TYPING edit
// (never on plain cursor moves); manual preview scrolling pauses it until
// the next keystroke. Spec: typing-latency-and-follow-preview US-3.
// ---------------------------------------------------------------------------
export function getFollowTyping(): boolean {
  return safeRead(KEY_FOLLOW_TYPING) !== "false";
}
export function setFollowTypingPref(value: boolean): void {
  safeWrite(KEY_FOLLOW_TYPING, String(value));
  broadcastChange(KEY_FOLLOW_TYPING);
}

// ---------------------------------------------------------------------------
// Subscribe to setting changes (works across components in the same tab).
// localStorage 'storage' events only fire ACROSS tabs, so we also dispatch a
// CustomEvent on this tab. Callers receive both via the same listener here.
// ---------------------------------------------------------------------------
export function subscribeSettings(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onCustom = () => callback();
  const onStorage = (e: StorageEvent) => {
    if (
      e.key === KEY_OUTLINE_AUTOHIGHLIGHT ||
      e.key === KEY_SVG_MODE ||
      e.key === KEY_VIM_MODE ||
      e.key === KEY_FORMAT_ON_SAVE ||
      e.key === KEY_MATHLIVE ||
      e.key === KEY_SYNC_FORWARD ||
      e.key === KEY_SYNC_REVERSE ||
      e.key === KEY_FOLLOW_TYPING
    ) {
      callback();
    }
  };
  window.addEventListener(SETTINGS_CHANGED_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SETTINGS_CHANGED_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
