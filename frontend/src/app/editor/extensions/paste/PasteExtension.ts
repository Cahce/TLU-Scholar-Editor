/**
 * Smart-paste orchestrator (spec: visual-editor-aux-polish, US-2/3/4).
 *
 * Priority: image file > text/html > LaTeX-looking plain text > CM default.
 * Concept borrowed from TeXlyre's PasteExtension (image upload on paste) and
 * Overleaf's paste-html (architecture only). Inert in read-only mode and in
 * non-.typ files.
 *
 * Hybrid-model note: the image upload is an immediate backend call (it
 * creates a NEW binary file — the document text is only touched after the
 * upload succeeds, so no dangling path can ever be left in the source).
 * Text edits go through the normal draft + debounced autosave pipeline.
 */

import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { toast } from "sonner";

import { useEditorStore } from "../../state/editorStore";
import { ApiEditorStorageService } from "../../services/ApiEditorStorageService";
import { htmlToTypst } from "./html-to-typst";
import { convertLatexText, looksLikeLatexMath } from "./latex-detect";

const storage = new ApiEditorStorageService();

const IMAGE_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export function pasteExtension(): Extension {
  return EditorView.domEventHandlers({
    paste: (event, view) => handlePaste(event, view),
  });
}

function handlePaste(event: ClipboardEvent, view: EditorView): boolean {
  if (view.state.readOnly) return false;
  const { activePath, files } = useEditorStore.getState();
  if (!activePath || files[activePath]?.kind !== "typst") return false;
  const data = event.clipboardData;
  if (!data) return false;

  // 1) Image file (screenshot, copied image) → upload + insert #figure.
  const imageFile = pickImageFile(data);
  if (imageFile) {
    event.preventDefault();
    void handleImagePaste(view, imageFile);
    return true;
  }

  const plain = data.getData("text/plain");

  // 2) Rich text → Typst markup, with a one-click plain-text fallback.
  const html = data.getData("text/html");
  if (html && html.trim()) {
    const converted = htmlToTypst(html);
    // Only take over when conversion produced real markup — otherwise let
    // CodeMirror paste the plain text itself (AC-3.4).
    if (converted != null && converted !== plain.trim()) {
      event.preventDefault();
      insertHtmlConversion(view, converted, plain);
      return true;
    }
    return false;
  }

  // 3) Plain text that smells like LaTeX math → paste verbatim, offer
  //    conversion (non-blocking; the original text is what lands in the doc).
  if (plain && looksLikeLatexMath(plain)) {
    event.preventDefault();
    const sel = view.state.selection.main;
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: plain },
      selection: { anchor: sel.from + plain.length },
      userEvent: "input.paste",
    });
    offerLatexConversion(view, sel.from, plain);
    return true;
  }

  return false;
}

/* ------------------------------ image paste ------------------------------ */

function pickImageFile(data: DataTransfer): File | null {
  for (const item of Array.from(data.items)) {
    if (item.kind === "file" && IMAGE_EXT[item.type]) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}

/** `images/pasted-<yyyyMMdd-HHmmss>.<ext>`, suffixed `-2`, `-3`… on clash. */
function pastedImagePath(
  ext: string,
  existing: Record<string, unknown>,
): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  const stamp =
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  let path = `images/pasted-${stamp}.${ext}`;
  for (let i = 2; existing[path] != null; i++) {
    path = `images/pasted-${stamp}-${i}.${ext}`;
  }
  return path;
}

async function handleImagePaste(view: EditorView, file: File): Promise<void> {
  const { projectId, files } = useEditorStore.getState();
  if (!projectId) return;
  const ext = IMAGE_EXT[file.type] ?? "png";
  const path = pastedImagePath(ext, files);
  const toastId = toast.loading("Đang tải ảnh lên…");
  try {
    const created = await storage.uploadBinaryFile(projectId, path, file, "image");
    const bytes = new Uint8Array(await file.arrayBuffer());
    // Same post-upload bookkeeping as useFileMutations.uploadBinaryFile.
    const store = useEditorStore.getState();
    store.upsertFile({ ...created, binaryContent: bytes });
    store.pushUndo({ type: "create", path: created.path });
    void store.refreshFileList();

    const pos = view.state.selection.main.head;
    const line = view.state.doc.lineAt(pos);
    const lead = pos === line.from || line.text.length === 0 ? "" : "\n";
    const snippet = `${lead}#figure(\n  image("${created.path}"),\n  caption: [],\n)\n`;
    view.dispatch({
      changes: { from: pos, to: pos, insert: snippet },
      selection: { anchor: pos + snippet.length },
      userEvent: "input.paste.image",
    });
    view.focus();
    toast.success(`Đã tải lên ${created.path}`, { id: toastId });
  } catch (err) {
    // Backend errors (quota, validation) surface their own message via the
    // ApiError mapping; nothing is inserted into the document on failure.
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    toast.error(`Tải ảnh thất bại: ${msg}`, { id: toastId });
  }
}

/* ------------------------------- html paste ------------------------------ */

function insertHtmlConversion(
  view: EditorView,
  converted: string,
  plain: string,
): void {
  const sel = view.state.selection.main;
  const from = sel.from;
  view.dispatch({
    changes: { from, to: sel.to, insert: converted },
    selection: { anchor: from + converted.length },
    userEvent: "input.paste",
  });
  toast.success("Đã chuyển đổi nội dung dán từ HTML", {
    action: {
      label: "Dán dạng văn bản thuần",
      onClick: () => {
        // Replace only if the converted block is still intact.
        const current = view.state.doc.sliceString(from, from + converted.length);
        if (current !== converted) {
          toast.error("Văn bản đã thay đổi — không thể chuyển kiểu dán");
          return;
        }
        view.dispatch({
          changes: { from, to: from + converted.length, insert: plain },
          selection: { anchor: from + plain.length },
          userEvent: "input.paste",
        });
        view.focus();
      },
    },
  });
}

/* ------------------------------ latex paste ------------------------------ */

function offerLatexConversion(
  view: EditorView,
  from: number,
  original: string,
): void {
  toast("Phát hiện công thức LaTeX", {
    description: "Chuyển sang cú pháp Typst?",
    action: {
      label: "Chuyển đổi",
      onClick: () => void applyLatexConversion(view, from, original),
    },
  });
}

async function applyLatexConversion(
  view: EditorView,
  from: number,
  original: string,
): Promise<void> {
  try {
    const { converted, failures, successes } = await convertLatexText(original);
    if (successes === 0) {
      toast.info("Không có công thức nào chuyển đổi được — giữ nguyên văn bản");
      return;
    }
    const current = view.state.doc.sliceString(from, from + original.length);
    if (current !== original) {
      toast.error("Văn bản đã thay đổi — bỏ qua chuyển đổi");
      return;
    }
    view.dispatch({
      changes: { from, to: from + original.length, insert: converted },
      selection: { anchor: from + converted.length },
      userEvent: "input.paste",
    });
    view.focus();
    if (failures > 0) {
      toast.warning(`${failures} công thức giữ nguyên do không chuyển đổi được`);
    }
  } catch {
    toast.error("Không thể nạp bộ chuyển đổi LaTeX");
  }
}
