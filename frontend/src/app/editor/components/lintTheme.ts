import { EditorView } from "@codemirror/view";

/**
 * Custom lint theme matching Tailwind colors for both light and dark modes.
 * Overrides CodeMirror's default lint colors to match typst.app style.
 */
export const lintTheme = EditorView.theme({
  // Error markers (red)
  ".cm-diagnostic-error": {
    borderBottom: "2px wavy rgb(220, 38, 38)", // red-600
  },
  ".cm-lintRange-error": {
    backgroundColor: "rgba(220, 38, 38, 0.1)",
  },
  
  // Warning markers (amber)
  ".cm-diagnostic-warning": {
    borderBottom: "2px wavy rgb(217, 119, 6)", // amber-600
  },
  ".cm-lintRange-warning": {
    backgroundColor: "rgba(217, 119, 6, 0.1)",
  },
  
  // Info/hint markers (sky)
  ".cm-diagnostic-info": {
    borderBottom: "2px dotted rgb(2, 132, 199)", // sky-600
  },
  ".cm-lintRange-info": {
    backgroundColor: "rgba(2, 132, 199, 0.1)",
  },
  
  // Gutter markers
  ".cm-lint-marker-error": {
    content: '""',
    display: "inline-block",
    width: "0.6em",
    height: "0.6em",
    borderRadius: "50%",
    backgroundColor: "rgb(220, 38, 38)", // red-600
  },
  ".cm-lint-marker-warning": {
    content: '""',
    display: "inline-block",
    width: "0.6em",
    height: "0.6em",
    borderRadius: "50%",
    backgroundColor: "rgb(217, 119, 6)", // amber-600
  },
  ".cm-lint-marker-info": {
    content: '""',
    display: "inline-block",
    width: "0.6em",
    height: "0.6em",
    borderRadius: "50%",
    backgroundColor: "rgb(2, 132, 199)", // sky-600
  },
  
  // Tooltip styling
  ".cm-tooltip.cm-tooltip-lint": {
    backgroundColor: "white",
    border: "1px solid rgb(226, 232, 240)", // slate-200
    borderRadius: "0.375rem",
    padding: "0.5rem",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  },
  
  // Dark mode overrides
  ".dark .cm-tooltip.cm-tooltip-lint": {
    backgroundColor: "rgb(30, 41, 59)", // slate-800
    border: "1px solid rgb(51, 65, 85)", // slate-700
    color: "rgb(226, 232, 240)", // slate-200
  },
  ".dark .cm-diagnostic-error": {
    borderBottom: "2px wavy rgb(239, 68, 68)", // red-500 (lighter for dark mode)
  },
  ".dark .cm-diagnostic-warning": {
    borderBottom: "2px wavy rgb(245, 158, 11)", // amber-500
  },
  ".dark .cm-diagnostic-info": {
    borderBottom: "2px dotted rgb(14, 165, 233)", // sky-500
  },
});
