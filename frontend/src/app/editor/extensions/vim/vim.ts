import { Compartment } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { vim } from "@replit/codemirror-vim";
import { vimTheme } from "./vimTheme";

/**
 * Vim mode wiring for CodeMirror.
 *
 * Mirrors the {@link ../visual/visual.ts visual} compartment so the editor
 * can toggle Vim keybindings live without rebuilding the view. Consumers:
 *   1. Mount with `vimExtension(initialEnabled)` inside the extensions array.
 *   2. On the user pref changing, call `setVimMode(view, enabled)` from a
 *      `useEffect` — this dispatches a compartment reconfigure transaction
 *      that costs O(1) on the CodeMirror side.
 *
 * The compartment holds BOTH `vim()` and `vimTheme` so toggling Vim off
 * tears down the (loud, salmon-coloured) block cursor styling automatically.
 *
 * Pref source of truth: `previewSettings.getVimMode()` (localStorage).
 */

export const vimCompartment = new Compartment();

// Group the Vim keymap with our slate fat-cursor theme so they live and die
// together inside the compartment.
const vimWithTheme: Extension = [vim(), vimTheme];

export function vimExtension(initialEnabled: boolean): Extension {
  return vimCompartment.of(initialEnabled ? vimWithTheme : []);
}

export function setVimMode(view: EditorView, enabled: boolean): void {
  view.dispatch({
    effects: vimCompartment.reconfigure(enabled ? vimWithTheme : []),
  });
}
