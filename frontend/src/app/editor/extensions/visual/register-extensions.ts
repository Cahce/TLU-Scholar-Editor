import type { Extension } from "@codemirror/state";

import { atomicDecorationsExt } from "./atomic-decorations";
import { markDecorationsExt } from "./mark-decorations";
import { visualKeymap } from "./visual-keymap";
import { linkClickExtension } from "./widgets/LinkWidget";
import { registerVisualExtensions } from "./visual";

// NOTE: raw-script code-line styling now lives INSIDE `atomicDecorationsExt`
// (a StateField). CodeMirror only accepts line decorations from a StateField;
// providing them from a ViewPlugin could break the whole visual layer.
registerVisualExtensions((): Extension[] => {
  return [
    atomicDecorationsExt,
    markDecorationsExt,
    visualKeymap,
    linkClickExtension(),
  ];
});
