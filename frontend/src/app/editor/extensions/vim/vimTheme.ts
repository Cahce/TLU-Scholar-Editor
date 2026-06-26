import { EditorView } from "@codemirror/view";

/**
 * Theme overrides for the Vim extension's block cursor.
 *
 * `@replit/codemirror-vim` ships a default style for `.cm-fat-cursor` of
 * `background: #ff9696;` (salmon). On most sRGB displays this reads as a
 * loud red, which surprised users opening the editor in Normal mode after
 * a page reload — they reported the cursor as "red" with no indication that
 * Vim mode was the cause.
 *
 * We replace the salmon with a translucent slate so the block is clearly
 * visible against the white editor background without looking like an
 * error/warning marker (we already reserve solid red for lint diagnostics).
 * Slate-500 @ 45% opacity feels neutral; a slate-600 outline keeps the
 * block crisp at small font sizes.
 *
 * Mounted alongside `vim()` inside the Vim compartment so toggling Vim mode
 * off via Settings tears down the theme too.
 *
 * References:
 *   - @replit/codemirror-vim default style: `node_modules/@replit/codemirror-vim/dist/index.js`
 *     search for `.cm-fat-cursor`.
 *   - CodeMirror EditorView.theme: https://codemirror.net/docs/ref/#view.EditorView^theme
 */
export const vimTheme = EditorView.theme({
  // The filled block displayed in Normal / Visual mode when the editor has
  // focus. Using opacity here (instead of a flat colour) keeps the
  // underlying character visible — important for users reading the line
  // they're about to operate on.
  ".cm-fat-cursor": {
    background: "rgba(100, 116, 139, 0.45)", // slate-500 @ 45%
    outline: "1px solid rgb(71, 85, 105)", // slate-600
    color: "inherit",
  },
  // The hollow block displayed when the editor is unfocused. Reuse the
  // same hue so the visual identity stays consistent between focus states.
  "&:not(.cm-focused) .cm-fat-cursor": {
    outline: "1px dashed rgb(100, 116, 139)", // slate-500
    background: "transparent",
  },
  // Vim's selection-mark cursor (in Visual mode the anchor is rendered
  // alongside the head). Mirror the head style for consistency.
  ".cm-fat-cursor-mark": {
    background: "rgba(100, 116, 139, 0.30)",
  },
  // The status / command panel `@replit/codemirror-vim` opens at the bottom
  // when typing `:` etc. Default styling has minimal padding and a system
  // monospace font is more legible than the inherited sans.
  ".cm-vim-panel, .cm-panel.cm-vim-panel": {
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: "12px",
    padding: "2px 6px",
  },
});
