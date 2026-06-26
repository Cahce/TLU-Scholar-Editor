import { useEditorStore } from "../state/editorStore";
import type { FileKind } from "../types/editor";
import { EditorPane } from "./EditorPane";
import { BinaryFileViewer } from "./binary/BinaryFileViewer";

const BINARY_KINDS = new Set<FileKind>(["image", "vector", "font", "pdf"]);

/**
 * Top-level dispatcher for the workspace center pane.
 *
 * Picks between the CodeMirror-based `EditorPane` (for text-like files: typst,
 * bib, markdown, config, data, text, other) and the `BinaryFileViewer` (for
 * image / svg / pdf / font). Subscribes only to the active path's `kind` so
 * the viewer doesn't re-render on every keystroke of an unrelated text draft.
 *
 * `EditorPane` already handles its own "Chưa chọn tệp" empty state — we only
 * route to BinaryFileViewer when we have both an `activePath` and a binary kind.
 *
 * `.bib` files render as a plain editor — reference browsing and entry
 * management (add / edit / delete / de-duplicate) live in the sidebar
 * "Tài liệu tham khảo" panel (`BibliographyPanel`), not a bar over the editor.
 */
export function FileViewer(): JSX.Element {
  const activePath = useEditorStore((s) => s.activePath);
  const fileKind = useEditorStore((s) =>
    activePath ? s.files[activePath]?.kind : undefined,
  );

  if (activePath && fileKind && BINARY_KINDS.has(fileKind)) {
    return <BinaryFileViewer path={activePath} />;
  }

  return <EditorPane />;
}
