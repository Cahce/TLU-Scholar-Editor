import { forwardRef, useEffect, useState } from "react";
import { toast } from "sonner";
import { ColorPickerPopover } from "./ColorPickerPopover";
import { TableInsertGrid } from "./TableInsertGrid";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading,
  List,
  ListOrdered,
  Sigma,
  FunctionSquare,
  Code,
  SquareCode,
  AtSign,
  BookOpen,
  MessageSquare,
  Link as LinkIcon,
  Quote,
  Image as ImageIcon,
  Table as TableIcon,
  Bookmark,
  FlaskConical,
  Tag,
  Palette,
  Highlighter,
  ChevronDown,
  PanelBottomOpen,
  PanelBottomClose,
} from "lucide-react";
import { useEditorStore } from "../state/editorStore";
import type { FileKind } from "../types/editor";
import {
  insertCodeBlock,
  insertColoredText,
  insertDisplayMath,
  insertEquation,
  insertGridTable,
  insertHeading,
  insertHighlight,
  insertLabel,
  insertListMarker,
  insertReference,
  insertText,
  wrapSelection,
} from "../utils/cmInsert";
import {
  applyTableAction,
  findTableAt,
  TABLE_CONTEXT_EVENT,
  type TableAction,
  type TableContextSummary,
} from "../extensions/visual/table-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import type { EditorView } from "@codemirror/view";
import { ensureWhalogenImport } from "../lib/chemistry";

// File kinds where it makes sense to inject Typst markup. Binary files have
// no text draft, so the toolbar disables itself.
const TEXT_KINDS = new Set<FileKind>([
  "typst",
  "bib",
  "markdown",
  "config",
  "text",
  "data",
  "other",
]);

// Non-code binary kinds routed to BinaryFileViewer (mirrors FileViewer). The
// insert commands don't apply to these, so the toolbar keeps them disabled and
// adds a metadata-panel toggle on the right.
const BINARY_KINDS = new Set<FileKind>(["image", "vector", "font", "pdf"]);

interface ToolbarButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  onClick?: () => void;
  title: string;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}

// `forwardRef` is required so Radix's `asChild` (Slot pattern) used by
// PopoverTrigger / DropdownMenuTrigger can attach its ref + compose its
// click handler with this button. Without it, asChild would silently fail
// to wire up open/close behaviour.
const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  function ToolbarButton(
    { onClick, title, disabled = false, children, active, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-label={title}
        className={`p-1.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/30 ${
          active
            ? "bg-white text-slate-900 shadow-sm"
            : disabled
              ? "text-slate-300 cursor-not-allowed"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

interface DropdownTriggerButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  title: string;
  disabled: boolean;
  children: React.ReactNode;
}

// forwardRef so Radix's `DropdownMenuTrigger asChild` (Slot pattern) can attach
// its ref + ARIA wiring to the underlying <button>. Without this React warns
// "Function components cannot be given refs" and Radix loses keyboard support.
const DropdownTriggerButton = forwardRef<HTMLButtonElement, DropdownTriggerButtonProps>(
  ({ title, disabled, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      {...rest}
      className={`flex items-center gap-0.5 p-1.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/30 ${
        disabled
          ? "text-slate-300 cursor-not-allowed"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {children}
      <ChevronDown className="w-3 h-3 opacity-60" />
    </button>
  ),
);
DropdownTriggerButton.displayName = "DropdownTriggerButton";

/**
 * Insert toolbar that injects Typst markup at the cursor — inspired by
 * Typst.app and TeXlyre. Reads the live EditorView from the store via
 * `editorViewRef.current` so command callbacks operate on whichever file is
 * currently active in CodeMirror.
 *
 * Groups (left → right):
 *   B/I/U/S  •  H▾  •  list/numbered  •  Math▾  •  Code▾  •  Link/Cite/Ref/Label
 *           •  Figure/Table/Quote/Footnote  •  Color▾
 */
export function InsertToolbar(): JSX.Element {
  const activePath = useEditorStore((s) => s.activePath);
  const activeKind = useEditorStore((s) =>
    activePath ? s.files[activePath]?.kind : undefined,
  );
  const readOnly = useEditorStore((s) => s.readOnly);
  const binaryInfoVisible = useEditorStore((s) => s.binaryInfoVisible);
  const toggleBinaryInfo = useEditorStore((s) => s.toggleBinaryInfo);

  const isBinary = activeKind !== undefined && BINARY_KINDS.has(activeKind);
  const disabled =
    !activePath || (activeKind !== undefined && !TEXT_KINDS.has(activeKind));

  // Contextual table actions: visibility driven by the editor's
  // tableContextNotifier extension; actions re-resolve the live context on
  // click so stale events can't corrupt text.
  const [tableCtx, setTableCtx] = useState<TableContextSummary>({
    hasTable: false,
    canQuickEdit: false,
  });
  useEffect(() => {
    function onCtx(ev: Event) {
      setTableCtx((ev as CustomEvent<TableContextSummary>).detail);
    }
    window.addEventListener(TABLE_CONTEXT_EVENT, onCtx);
    return () => window.removeEventListener(TABLE_CONTEXT_EVENT, onCtx);
  }, []);
  // Switching files remounts the editor; the notifier only fires on
  // selection/doc updates, so reset to avoid a stale group from the old file.
  useEffect(() => {
    setTableCtx({ hasTable: false, canQuickEdit: false });
  }, [activePath]);

  function withView(action: (view: EditorView) => void): () => void {
    return () => {
      const view = useEditorStore.getState().editorViewRef.current;
      if (!view) return;
      action(view);
    };
  }

  function tableAct(action: TableAction): () => void {
    return withView((v) => {
      if (!applyTableAction(v, action)) {
        toast.error("Không thể áp dụng thao tác trên bảng này");
      }
    });
  }

  const openTableDialog = withView((v) => {
    const ctx = findTableAt(v.state, v.state.selection.main.head);
    if (!ctx?.model) return;
    window.dispatchEvent(
      new CustomEvent("editor:editTable", {
        detail: { from: ctx.from, to: ctx.to, model: ctx.model },
      }),
    );
  });

  // Read-only mode (admin "view in workspace"): editing commands don't apply to
  // editable text, so hide the toolbar. For binary files (PDF / image / SVG /
  // font) we keep it visible — the buttons are disabled anyway, but the
  // file-info toggle on the right stays available.
  if (readOnly && !isBinary) return null;

  return (
    <div className="h-10 border-b border-slate-200 bg-white flex items-center shrink-0">
      <div className="flex items-center gap-1 px-2 overflow-x-auto scrollbar-hide flex-1 min-w-0">
      {/* Inline text formatting */}
      <div className="flex items-center bg-slate-100 rounded p-0.5">
        <ToolbarButton
          onClick={withView((v) => wrapSelection(v, "*", "*"))}
          title="Đậm (Bold)"
          disabled={disabled}
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={withView((v) => wrapSelection(v, "_", "_"))}
          title="Nghiêng (Italic)"
          disabled={disabled}
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={withView((v) => wrapSelection(v, "#underline[", "]"))}
          title="Gạch chân (Underline)"
          disabled={disabled}
        >
          <Underline className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={withView((v) => wrapSelection(v, "#strike[", "]"))}
          title="Gạch ngang (Strikethrough)"
          disabled={disabled}
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />

      {/* Headings — dropdown for H1-H4 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <DropdownTriggerButton title="Tiêu đề (Heading)" disabled={disabled}>
            <Heading className="w-4 h-4" />
          </DropdownTriggerButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={withView((v) => insertHeading(v, 1))}>
            <span className="font-bold text-base mr-2">H1</span> Tiêu đề chính
          </DropdownMenuItem>
          <DropdownMenuItem onClick={withView((v) => insertHeading(v, 2))}>
            <span className="font-bold text-sm mr-2">H2</span> Tiêu đề mục
          </DropdownMenuItem>
          <DropdownMenuItem onClick={withView((v) => insertHeading(v, 3))}>
            <span className="font-bold text-sm mr-2">H3</span> Tiêu đề con
          </DropdownMenuItem>
          <DropdownMenuItem onClick={withView((v) => insertHeading(v, 4))}>
            <span className="font-bold text-xs mr-2">H4</span> Tiêu đề nhỏ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />

      {/* Lists */}
      <ToolbarButton
        onClick={withView((v) => insertListMarker(v, "-"))}
        title="Toggle list (Danh sách dấu chấm)"
        disabled={disabled}
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={withView((v) => insertListMarker(v, "+"))}
        title="Toggle enumeration (Danh sách đánh số)"
        disabled={disabled}
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />

      {/* Math — dropdown: inline / display / equation */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <DropdownTriggerButton title="Công thức toán (Math)" disabled={disabled}>
            <Sigma className="w-4 h-4" />
          </DropdownTriggerButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={withView((v) => wrapSelection(v, "$", "$"))}>
            <Sigma className="w-4 h-4 mr-2 text-slate-500" /> Toán nội dòng (Inline)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={withView((v) => insertDisplayMath(v))}>
            <FunctionSquare className="w-4 h-4 mr-2 text-slate-500" /> Toán khối (Display)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={withView((v) => insertEquation(v))}>
            <span className="mr-2 text-slate-500 font-mono w-4 text-center">=</span>{" "}
            Phương trình (Equation)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Code — dropdown: inline / block */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <DropdownTriggerButton title="Mã (Code)" disabled={disabled}>
            <Code className="w-4 h-4" />
          </DropdownTriggerButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={withView((v) => wrapSelection(v, "`", "`"))}>
            <Code className="w-4 h-4 mr-2 text-slate-500" /> Mã nội dòng (Inline)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={withView((v) => insertCodeBlock(v))}>
            <SquareCode className="w-4 h-4 mr-2 text-slate-500" /> Khối mã (Block)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />

      {/* References & links — collapsed into a single dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <DropdownTriggerButton
            title="Tham chiếu (References & Links)"
            disabled={disabled}
          >
            <AtSign className="w-4 h-4" />
          </DropdownTriggerButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={withView((v) => {
              const sel = v.state.selection.main;
              const selected = v.state.doc.sliceString(sel.from, sel.to);
              if (selected) {
                insertText(v, `#link("")[${selected}]`, -(selected.length + 4));
              } else {
                insertText(v, `#link("")[]`, -4);
              }
            })}
          >
            <LinkIcon className="w-4 h-4 mr-2 text-slate-500" /> Liên kết (Link)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={withView((v) => {
              const sel = v.state.selection.main;
              const selected = v.state.doc.sliceString(sel.from, sel.to);
              if (selected) {
                insertText(v, `@${selected}`, 0);
              } else {
                insertText(v, `#cite(<>)`, -2);
              }
            })}
          >
            <BookOpen className="w-4 h-4 mr-2 text-slate-500" /> Trích dẫn (Citation)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={withView((v) => insertReference(v))}>
            <Bookmark className="w-4 h-4 mr-2 text-slate-500" /> Tham chiếu (Reference)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={withView((v) => insertLabel(v))}>
            <Tag className="w-4 h-4 mr-2 text-slate-500" /> Nhãn (Label)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />

      {/* Insert objects — collapsed into a single dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <DropdownTriggerButton
            title="Chèn đối tượng (Insert)"
            disabled={disabled}
          >
            <ImageIcon className="w-4 h-4" />
          </DropdownTriggerButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={withView((v) => {
              window.dispatchEvent(
                new CustomEvent("editor:insertFigure", {
                  detail: { insertPos: v.state.selection.main.head },
                }),
              );
            })}
          >
            <ImageIcon className="w-4 h-4 mr-2 text-slate-500" /> Hình ảnh (Figure)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={withView((v) => {
              const sel = v.state.selection.main;
              const selected = v.state.doc.sliceString(sel.from, sel.to);
              insertText(
                v,
                `#quote[\n${selected}\n]`,
                selected ? -(selected.length + 2) : -2,
              );
            })}
          >
            <Quote className="w-4 h-4 mr-2 text-slate-500" /> Trích đoạn (Quote)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={withView((v) => wrapSelection(v, "#footnote[", "]"))}
          >
            <MessageSquare className="w-4 h-4 mr-2 text-slate-500" /> Chú thích (Footnote)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={withView((v) => {
              ensureWhalogenImport(v);
              insertText(v, '#ce("")', -2);
            })}
          >
            <FlaskConical className="w-4 h-4 mr-2 text-slate-500" /> Công thức hoá học (Chemistry)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Table — Word-style size grid picker */}
      <TableInsertGrid
        disabled={disabled}
        onPick={(rows, cols, withHeader) => {
          const view = useEditorStore.getState().editorViewRef.current;
          if (view) insertGridTable(view, rows, cols, withHeader);
        }}
      >
        <ToolbarButton title="Bảng (Table)" disabled={disabled}>
          <TableIcon className="w-4 h-4" />
        </ToolbarButton>
      </TableInsertGrid>

      {/* Contextual table actions — visible while the cursor is inside a
          #table(...) call (Code mode or a revealed line in Visual mode). */}
      {tableCtx.hasTable && (
        <>
          <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />
          <div className="flex items-center gap-0.5 rounded bg-blue-50 px-1 py-0.5 shrink-0">
            <span className="px-1 text-[11px] font-medium text-blue-700">
              Bảng
            </span>
            <ToolbarButton
              onClick={tableAct("addRow")}
              title="Thêm hàng (sau hàng tại con trỏ)"
              disabled={!tableCtx.canQuickEdit}
            >
              <span className="text-xs font-medium">+Hàng</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={tableAct("deleteRow")}
              title="Xóa hàng tại con trỏ"
              disabled={!tableCtx.canQuickEdit}
            >
              <span className="text-xs font-medium">−Hàng</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={tableAct("addColumn")}
              title="Thêm cột (sau cột tại con trỏ)"
              disabled={!tableCtx.canQuickEdit}
            >
              <span className="text-xs font-medium">+Cột</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={tableAct("deleteColumn")}
              title="Xóa cột tại con trỏ"
              disabled={!tableCtx.canQuickEdit}
            >
              <span className="text-xs font-medium">−Cột</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={openTableDialog}
              title={
                tableCtx.canQuickEdit
                  ? "Sửa bảng trong hộp thoại"
                  : "Bảng phức tạp — sửa trực tiếp trong mã nguồn"
              }
              disabled={!tableCtx.canQuickEdit}
            >
              <span className="text-xs font-medium">Sửa bảng</span>
            </ToolbarButton>
          </div>
        </>
      )}

      <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />

      {/* Text colour — TeXlyre-style popover, commits on confirm only */}
      <ColorPickerPopover
        ariaLabel="Màu chữ (Text Color)"
        onApply={(hex) => {
          const view = useEditorStore.getState().editorViewRef.current;
          if (view) insertColoredText(view, hex);
        }}
      >
        <ToolbarButton title="Màu chữ (Text Color)" disabled={disabled}>
          <Palette className="w-4 h-4" />
        </ToolbarButton>
      </ColorPickerPopover>

      {/* Highlight — same popover pattern */}
      <ColorPickerPopover
        ariaLabel="Tô sáng (Highlight)"
        onApply={(hex) => {
          const view = useEditorStore.getState().editorViewRef.current;
          if (view) insertHighlight(view, hex);
        }}
      >
        <ToolbarButton title="Tô sáng (Highlight)" disabled={disabled}>
          <Highlighter className="w-4 h-4" />
        </ToolbarButton>
      </ColorPickerPopover>
      </div>

      {/* Metadata-panel toggle — only for non-code files. Pinned outside the
          scrollable group row so it stays reachable on narrow editor panes. */}
      {isBinary && (
        <div className="flex shrink-0 items-center border-l border-slate-200 pl-2 pr-1">
          <button
            type="button"
            onClick={toggleBinaryInfo}
            aria-pressed={binaryInfoVisible}
            title={binaryInfoVisible ? "Ẩn thông tin tệp" : "Hiện thông tin tệp"}
            aria-label={
              binaryInfoVisible ? "Ẩn thông tin tệp" : "Hiện thông tin tệp"
            }
            className={`flex items-center rounded p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/30 ${
              binaryInfoVisible
                ? "bg-blue-50 text-[#007bff] hover:bg-blue-100"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {binaryInfoVisible ? (
              <PanelBottomClose className="w-4 h-4" />
            ) : (
              <PanelBottomOpen className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
