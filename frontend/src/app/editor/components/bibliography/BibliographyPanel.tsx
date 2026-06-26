/**
 * BibliographyPanel
 *
 * Single home for everything related to the project's reference files
 * (`.bib` / `.yml`) and citation style. It centralises:
 *   - the citation-style picker (built-in styles + any project `.csl` file),
 *   - the list of reference files,
 *   - browsing + inserting citations, and
 *   - managing `.bib` entries (add / edit / delete / de-duplicate).
 *
 * Entry management used to live in a separate `BibEditorHint` bar floating over
 * the editor whenever a `.bib` was open — that duplicated this panel's title and
 * entry list and was distracting, so it was folded in here. Management mutations
 * go through `useBibFileMutations` (path-targeted: they edit the *selected*
 * reference file's draft + autosave, even when it isn't the file open in the
 * editor). Citation insertion and style changes still go through the active
 * CodeMirror view so they land in the user's `.typ` and keep undo + autosave.
 *
 * Kept separate from the Zotero and OpenAlex panels by design.
 */

import { useEffect, useMemo, useState } from "react";
import {
  BookText,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Quote,
  Search,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { useEditorStore } from "../../state/editorStore";
import { useBibFiles } from "../../hooks/useBibFiles";
import {
  useInsertCitation,
  useSetBibliographyStyle,
} from "../../hooks/useInsertCitation";
import { useBibFileMutations } from "../../hooks/useBibFileMutations";
import {
  analyzeBibSource,
  type ParsedBibEntry,
} from "../../services/BibDuplicateService";
import { findBibliographyCall } from "../../lib/bibliographyCall";
import { detectBibFormat, formatLabel, isBibPath } from "../../lib/bibFormat";
import { BUILTIN_CITATION_STYLES, isCslPath } from "../../lib/citationStyles";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { AddBibEntryDialog } from "./AddBibEntryDialog";
import { CleanupDialog } from "./CleanupDialog";

interface BibliographyPanelProps {
  projectId: string;
}

function fileName(path: string): string {
  return path.split("/").pop() ?? path;
}

export function BibliographyPanel(_props: BibliographyPanelProps): JSX.Element {
  const files = useEditorStore((s) => s.files);
  const drafts = useEditorStore((s) => s.drafts);
  const activePath = useEditorStore((s) => s.activePath);
  const setActivePath = useEditorStore((s) => s.setActivePath);

  const { bibFiles } = useBibFiles();
  const insertCitation = useInsertCitation();
  const setBibliographyStyle = useSetBibliographyStyle();

  const [selectedBib, setSelectedBib] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pendingStyle, setPendingStyle] = useState<string>("");

  // Entry-management dialog state (moved here from the old BibEditorHint).
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ParsedBibEntry | null>(null);
  const [cleanupOpen, setCleanupOpen] = useState(false);

  // Effective selected bib: explicit selection → active file if it's a bib →
  // first bib in the project.
  const effectiveBib = useMemo(() => {
    if (selectedBib && files[selectedBib]) return selectedBib;
    if (activePath && isBibPath(activePath)) return activePath;
    return bibFiles[0]?.path ?? null;
  }, [selectedBib, files, activePath, bibFiles]);

  const mutations = useBibFileMutations(effectiveBib);

  // Lazy-load the selected bib content so entries show even if the file was
  // never opened as a tab.
  const bibContent = useEditorStore((s) =>
    effectiveBib
      ? s.drafts[effectiveBib]?.content ?? s.files[effectiveBib]?.textContent ?? null
      : null,
  );
  useEffect(() => {
    if (effectiveBib && bibContent == null) {
      void useEditorStore.getState().ensureDraftLoaded(effectiveBib).catch(() => {});
    }
  }, [effectiveBib, bibContent]);

  // Detect the .typ that owns the `#bibliography(...)` call and its current
  // style, so the picker can show + target the right place.
  const bibCall = useMemo(() => {
    const typPaths = Object.values(files)
      .map((f) => f.path)
      .filter((p) => p.toLowerCase().endsWith(".typ"))
      .sort((a, b) => {
        // Prefer main.typ first, then shorter (top-level) paths.
        const am = a.endsWith("main.typ") ? 0 : 1;
        const bm = b.endsWith("main.typ") ? 0 : 1;
        return am - bm || a.length - b.length;
      });
    for (const p of typPaths) {
      const content = drafts[p]?.content ?? files[p]?.textContent ?? "";
      if (!content) continue;
      const call = findBibliographyCall(content);
      if (call) return { path: p, style: call.style };
    }
    return null;
  }, [files, drafts]);

  const currentStyle = bibCall?.style ?? null;

  // Keep the picker in sync with the detected style.
  useEffect(() => {
    setPendingStyle(currentStyle ?? "ieee");
  }, [currentStyle]);

  // Project .csl files surfaced as custom style options.
  const cslPaths = useMemo(
    () => Object.values(files).map((f) => f.path).filter(isCslPath).sort(),
    [files],
  );

  // Ensure the currently-selected style is always an option even if it isn't a
  // known built-in or a detected .csl (e.g. a hand-typed style name).
  const extraStyle =
    pendingStyle &&
    !BUILTIN_CITATION_STYLES.some((s) => s.value === pendingStyle) &&
    !cslPaths.includes(pendingStyle)
      ? pendingStyle
      : null;

  // Full BibTeX analysis (entries + duplicate groups + parse warnings). Entry
  // parsing is BibTeX-only for v1; `.yml`/`.yaml` reference files are still
  // listed and openable, just not structurally managed here.
  const isBibTexEffective = !!effectiveBib && /\.bib$/i.test(effectiveBib);
  const analysis = useMemo(() => {
    if (!isBibTexEffective || bibContent == null) return null;
    try {
      return analyzeBibSource(bibContent);
    } catch {
      return null;
    }
  }, [isBibTexEffective, bibContent]);
  const entries = analysis?.entries ?? [];
  const duplicateGroups = analysis?.duplicateGroups ?? [];
  const issues = analysis?.issues ?? [];
  const duplicateIndexes = useMemo(
    () => new Set(duplicateGroups.flatMap((g) => g.entries.map((e) => e.index))),
    [duplicateGroups],
  );

  // Management is only possible once a BibTeX file's content is loaded.
  const canManage = isBibTexEffective && bibContent != null;

  const visibleEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      [e.key, e.fields.author, e.fields.year, e.fields.title]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [entries, query]);

  const applyStyle = () => {
    if (!pendingStyle) return;
    const result = setBibliographyStyle(pendingStyle);
    if (result === "ok") {
      toast.success(`Đã đổi kiểu trích dẫn sang "${pendingStyle}"`);
    } else if (result === "no-call") {
      toast.error(
        bibCall
          ? `Mở ${fileName(bibCall.path)} (chứa #bibliography) rồi bấm Áp dụng`
          : "Tài liệu chưa có #bibliography(...) để đổi kiểu",
      );
    } else {
      toast.error("Hãy mở một tệp .typ trong trình soạn thảo rồi thử lại");
    }
  };

  const handleInsertCite = (key: string) => {
    if (insertCitation(key)) {
      toast.success(`Đã chèn #cite(<${key}>)`);
    } else {
      toast.error("Hãy đặt con trỏ trong một tệp .typ để chèn trích dẫn");
    }
  };

  const openAdd = () => {
    setEditingEntry(null);
    setDialogOpen(true);
  };

  const openEdit = (entry: ParsedBibEntry) => {
    setEditingEntry(entry);
    setDialogOpen(true);
  };

  const handleSubmitEntry = async (entrySource: string) => {
    const ok = editingEntry
      ? await mutations.replaceEntryAtIndex(editingEntry.index, entrySource)
      : await mutations.appendEntry(entrySource);
    if (ok) {
      toast.success(editingEntry ? "Đã cập nhật mục" : "Đã thêm mục");
    } else {
      toast.error("Không cập nhật được tài liệu tham khảo");
    }
  };

  const handleDelete = async (entry: ParsedBibEntry) => {
    const ok = window.confirm(`Xoá mục "${entry.key || "(không có key)"}"?`);
    if (!ok) return;
    if (await mutations.removeEntriesByIndex([entry.index])) {
      toast.success("Đã xoá mục");
    } else {
      toast.error("Không xoá được mục");
    }
  };

  const handleCleanupApply = async (
    group: Parameters<typeof mutations.applyDuplicateResolution>[0],
    action: Parameters<typeof mutations.applyDuplicateResolution>[1],
    selectedKeys: string[],
  ) => {
    if (await mutations.applyDuplicateResolution(group, action, { selectedKeys })) {
      toast.success("Đã áp dụng dọn trùng");
    } else {
      toast.error("Không áp dụng được lựa chọn này");
    }
  };

  const styleTargetIsActive = bibCall?.path === activePath;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
      {/* ── Citation style ─────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 p-3">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <BookText className="h-3.5 w-3.5" />
          Kiểu trích dẫn
        </h3>
        <div className="flex items-center gap-2">
          <Select value={pendingStyle} onValueChange={setPendingStyle}>
            <SelectTrigger className="h-9 flex-1" aria-label="Chọn kiểu trích dẫn">
              <SelectValue placeholder="Chọn kiểu..." />
            </SelectTrigger>
            <SelectContent>
              {extraStyle && (
                <SelectItem value={extraStyle}>{extraStyle} (hiện tại)</SelectItem>
              )}
              {BUILTIN_CITATION_STYLES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
              {cslPaths.map((p) => (
                <SelectItem key={p} value={p}>
                  {fileName(p)} (.csl)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-9" onClick={applyStyle}>
            Áp dụng
          </Button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          {currentStyle ? (
            <>
              Hiện tại: <code className="font-mono">{currentStyle}</code>
              {bibCall && ` · trong ${fileName(bibCall.path)}`}
            </>
          ) : (
            "Chưa phát hiện #bibliography(...) trong dự án."
          )}
          {cslPaths.length === 0 &&
            " Thêm tệp .csl vào dự án để dùng kiểu trích dẫn tùy chỉnh."}
        </p>
        {bibCall && !styleTargetIsActive && (
          <Button
            variant="link"
            size="sm"
            className="mt-1 h-auto px-0 text-[11px]"
            onClick={() => void setActivePath(bibCall.path)}
          >
            Mở {fileName(bibCall.path)} để áp dụng
          </Button>
        )}
      </section>

      {/* ── Reference files ────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 p-3">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <FileText className="h-3.5 w-3.5" />
          Tệp tham khảo
        </h3>
        {bibFiles.length === 0 ? (
          <p className="text-[12px] text-slate-500">
            Chưa có tệp .bib/.yml. Tạo <code className="font-mono">bibliography.bib</code>{" "}
            hoặc dùng Zotero / OpenAlex để thêm tài liệu.
          </p>
        ) : (
          <ul className="space-y-1">
            {bibFiles.map(({ path }) => {
              const fmt = detectBibFormat(path);
              const isSel = path === effectiveBib;
              return (
                <li key={path}>
                  {/* Select to browse/manage its entries below — selection does
                      NOT open the file as a tab, so "Chèn" keeps targeting the
                      user's active .typ. Use "Mở tệp" to hand-edit the file. */}
                  <button
                    type="button"
                    aria-pressed={isSel}
                    onClick={() => setSelectedBib(path)}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007bff]/40 ${
                      isSel
                        ? "bg-blue-50 text-[#007bff]"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">{fileName(path)}</span>
                    </span>
                    {fmt && (
                      <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        {formatLabel(fmt)}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Citations + entry management for the selected bib ───────────── */}
      <section className="flex min-h-0 flex-1 flex-col p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Quote className="h-3.5 w-3.5" />
            Danh sách trích dẫn
          </h3>
          {effectiveBib && (
            <button
              type="button"
              onClick={() => void setActivePath(effectiveBib)}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#007bff] focus:outline-none"
              title="Mở tệp trong trình soạn thảo để xem/sửa trực tiếp"
            >
              <ExternalLink className="h-3 w-3" />
              Mở tệp
            </button>
          )}
        </div>

        {/* Counts + duplicate / warning badges (BibTeX only) */}
        {canManage && (entries.length > 0 || duplicateGroups.length > 0 || issues.length > 0) && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            <span>{entries.length} mục</span>
            {duplicateGroups.length > 0 && (
              <Badge variant="destructive">{duplicateGroups.length} nhóm trùng</Badge>
            )}
            {issues.length > 0 && (
              <Badge variant="outline">{issues.length} cảnh báo</Badge>
            )}
          </div>
        )}

        {/* Manage actions (BibTeX only) */}
        {canManage && (
          <div className="mb-2 flex items-center gap-2">
            <Button size="sm" className="h-8 flex-1" onClick={openAdd}>
              <Plus className="mr-1 h-4 w-4" />
              Thêm
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              disabled={duplicateGroups.length === 0}
              onClick={() => setCleanupOpen(true)}
            >
              <Wand2 className="mr-1 h-4 w-4" />
              Dọn trùng
            </Button>
          </div>
        )}

        {/* Parse warnings */}
        {canManage && issues.length > 0 && (
          <div className="mb-2 rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
            {issues.map((issue, index) => (
              <div key={`${issue.code}-${index}`}>{issue.message}</div>
            ))}
          </div>
        )}

        {!effectiveBib ? (
          <p className="text-[12px] text-slate-500">
            Chọn một tệp tham khảo để xem các mục.
          </p>
        ) : !isBibTexEffective ? (
          <p className="text-[12px] text-slate-500">
            Quản lý mục hiện hỗ trợ tệp .bib. Bấm “Mở tệp” để chỉnh sửa{" "}
            {fileName(effectiveBib)} trực tiếp.
          </p>
        ) : bibContent == null ? (
          <p className="text-[12px] text-slate-500">Đang tải nội dung...</p>
        ) : entries.length === 0 ? (
          <p className="text-[12px] text-slate-500">
            Tệp chưa có mục nào. Bấm <span className="font-medium">Thêm</span> để
            tạo mục đầu tiên, hoặc dùng Zotero / OpenAlex.
          </p>
        ) : (
          <>
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm key, tác giả, năm, tiêu đề..."
                className="h-9 pl-8"
              />
            </div>
            <ul className="min-h-0 flex-1 space-y-1 overflow-auto">
              {visibleEntries.map((entry) => (
                <li
                  key={`${entry.index}-${entry.key}`}
                  className={`rounded-md border px-2 py-1.5 ${
                    duplicateIndexes.has(entry.index)
                      ? "border-red-200 bg-red-50"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-mono text-[12px] text-slate-800">
                        {entry.key || "(không có key)"}
                      </div>
                      <div className="truncate text-[11px] text-slate-500">
                        {[entry.fields.author, entry.fields.year]
                          .filter(Boolean)
                          .join(" · ") || entry.fields.title || ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        disabled={!entry.key}
                        onClick={() => handleInsertCite(entry.key)}
                        title={`Chèn #cite(<${entry.key}>)`}
                      >
                        Chèn
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => openEdit(entry)}
                        title="Sửa mục"
                        aria-label={`Sửa mục ${entry.key || "không có key"}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-600"
                        onClick={() => handleDelete(entry)}
                        title="Xoá mục"
                        aria-label={`Xoá mục ${entry.key || "không có key"}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
              {visibleEntries.length === 0 && (
                <li className="px-1 py-2 text-[12px] text-slate-500">
                  Không có mục khớp "{query}".
                </li>
              )}
            </ul>
          </>
        )}
      </section>

      {/* Add / edit entry dialog */}
      <AddBibEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmitEntry}
        initialEntry={editingEntry}
      />

      {/* Duplicate cleanup dialog */}
      <CleanupDialog
        open={cleanupOpen}
        onOpenChange={setCleanupOpen}
        groups={duplicateGroups}
        onApply={handleCleanupApply}
      />
    </div>
  );
}
