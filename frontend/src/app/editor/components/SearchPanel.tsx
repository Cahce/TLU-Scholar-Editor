import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CaseSensitive,
  ChevronDown,
  ChevronUp,
  FileText,
  Regex,
  Replace,
  Search,
  WholeWord,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useEditorStore } from "../state/editorStore";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface ProjectMatch {
  filePath: string;
  line: number;
  column: number;
  preview: string;
  matchStart: number;  // start index within `preview`
  matchLength: number;
}

interface SearchFlags {
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Compile a user query (plain or regex) into a global RegExp that respects
 * caseSensitive + wholeWord flags. Returns `null` when the query is empty or
 * the regex is invalid.
 */
function compileQuery(query: string, flags: SearchFlags): RegExp | null {
  if (!query) return null;
  let pattern = flags.regex ? query : escapeRegex(query);
  if (flags.wholeWord) pattern = `\\b(?:${pattern})\\b`;
  try {
    return new RegExp(pattern, flags.caseSensitive ? "g" : "gi");
  } catch {
    return null;
  }
}

function searchInContent(
  content: string,
  re: RegExp,
): Array<{ line: number; column: number; preview: string; matchStart: number; matchLength: number }> {
  const matches: Array<{ line: number; column: number; preview: string; matchStart: number; matchLength: number }> = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    // Fresh state per line — re.lastIndex resets implicitly because we make
    // a per-line clone. Using `re.exec` directly on `raw` with `/g` would
    // leak lastIndex across iterations.
    const lineRe = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = lineRe.exec(raw)) !== null) {
      const start = Math.max(0, m.index - 20);
      const preview = raw.slice(start, m.index + m[0].length + 30);
      matches.push({
        line: i + 1,
        column: m.index + 1,
        preview,
        matchStart: m.index - start,
        matchLength: m[0].length,
      });
      if (m.index === lineRe.lastIndex) lineRe.lastIndex++; // zero-width safety
    }
  }
  return matches;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[c] as string));
}

function highlightPreview(preview: string, matchStart: number, matchLength: number): string {
  const before = escapeHtml(preview.slice(0, matchStart));
  const match = escapeHtml(preview.slice(matchStart, matchStart + matchLength));
  const after = escapeHtml(preview.slice(matchStart + matchLength));
  return `${before}<mark class="bg-yellow-200 text-slate-900 rounded px-0.5">${match}</mark>${after}`;
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export function SearchPanel(): JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [searchScope, setSearchScope] = useState<"current" | "all">("current");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [regex, setRegex] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [regexError, setRegexError] = useState<string | null>(null);

  const activePath = useEditorStore((s) => s.activePath);
  const drafts = useEditorStore((s) => s.drafts);
  const files = useEditorStore((s) => s.files);
  const setActivePath = useEditorStore((s) => s.setActivePath);
  const setContent = useEditorStore((s) => s.setContent);

  const flags: SearchFlags = useMemo(
    () => ({ caseSensitive, wholeWord, regex }),
    [caseSensitive, wholeWord, regex],
  );

  // Validate regex inline — empty error means OK.
  useEffect(() => {
    if (!regex || !searchQuery) {
      setRegexError(null);
      return;
    }
    try {
      new RegExp(searchQuery);
      setRegexError(null);
    } catch (e) {
      setRegexError(e instanceof Error ? e.message : "Biểu thức không hợp lệ");
    }
  }, [regex, searchQuery]);

  /* ── Current-file search via events → EditorPane ─────────────────────── */

  const dispatchSearch = useCallback(
    (type: string, extra?: Record<string, unknown>) => {
      if (regex && regexError) return; // don't fire while regex is invalid
      window.dispatchEvent(
        new CustomEvent("editor:searchCmd", {
          detail: {
            type,
            query: searchQuery,
            caseSensitive,
            wholeWord,
            regex,
            ...extra,
          },
        }),
      );
    },
    [searchQuery, caseSensitive, wholeWord, regex, regexError],
  );

  const handleFindNext = () => dispatchSearch("findNext");
  const handleFindPrev = () => dispatchSearch("findPrev");
  const handleReplaceNext = () =>
    dispatchSearch("replaceNext", { replacement: replaceQuery });
  const handleReplaceAll = () =>
    dispatchSearch("replaceAll", { replacement: replaceQuery });

  /* ── Project-wide compiled regex ──────────────────────────────────────── */

  const compiledRegex = useMemo(() => compileQuery(searchQuery, flags), [searchQuery, flags]);

  /* ── Project-wide search ──────────────────────────────────────────────── */

  const projectMatches = useMemo<ProjectMatch[]>(() => {
    if (searchScope !== "all" || !compiledRegex) return [];

    const results: ProjectMatch[] = [];
    for (const [path, file] of Object.entries(files)) {
      // Skip binary / non-searchable kinds.
      if (file.kind === "image" || file.kind === "pdf" || file.kind === "font") continue;
      const content = drafts[path]?.content ?? file.textContent ?? "";
      if (!content) continue;
      const hits = searchInContent(content, compiledRegex);
      for (const h of hits) {
        results.push({ filePath: path, ...h });
        if (results.length >= 200) break;
      }
      if (results.length >= 200) break;
    }
    return results;
  }, [searchScope, compiledRegex, drafts, files]);

  /* ── Current-file match count (client-side, for display) ─────────────── */

  const currentFileMatchCount = useMemo(() => {
    if (searchScope !== "current" || !compiledRegex || !activePath) return 0;
    const content =
      drafts[activePath]?.content ?? files[activePath]?.textContent ?? "";
    return searchInContent(content, compiledRegex).length;
  }, [searchScope, compiledRegex, activePath, drafts, files]);

  /* ── Group project results by file ───────────────────────────────────── */

  const groupedMatches = useMemo(() => {
    const groups = new Map<string, ProjectMatch[]>();
    for (const m of projectMatches) {
      if (!groups.has(m.filePath)) groups.set(m.filePath, []);
      groups.get(m.filePath)!.push(m);
    }
    return groups;
  }, [projectMatches]);

  /* ── Navigate to a project match ─────────────────────────────────────── */

  const handleMatchClick = useCallback(
    (match: ProjectMatch) => {
      void setActivePath(match.filePath);
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("editor:jumpTo", {
            detail: { line: match.line, column: match.column },
          }),
        );
      }, 100);
    },
    [setActivePath],
  );

  /* ── Replace all in all files ─────────────────────────────────────────── */

  const handleReplaceAllInProject = useCallback(() => {
    if (!compiledRegex || groupedMatches.size === 0) return;
    const totalMatches = projectMatches.length;
    const fileCount = groupedMatches.size;
    if (totalMatches >= 200) {
      toast.warning(
        `Có hơn ${totalMatches} kết quả — hãy thu hẹp pattern trước khi thay tất cả.`,
      );
      return;
    }
    const confirmed = window.confirm(
      `Sẽ thay ${totalMatches} lần trong ${fileCount} tệp. Tiếp tục?`,
    );
    if (!confirmed) return;

    let replacedFiles = 0;
    let replacedTotal = 0;
    for (const [path, file] of Object.entries(files)) {
      if (file.kind === "image" || file.kind === "pdf" || file.kind === "font") continue;
      const content = drafts[path]?.content ?? file.textContent ?? "";
      if (!content) continue;
      // Fresh regex per file to avoid lastIndex carryover.
      const fileRe = new RegExp(compiledRegex.source, compiledRegex.flags);
      let count = 0;
      const replaced = content.replace(fileRe, (...args) => {
        count++;
        // Args: match, p1, p2, ..., offset, original.
        // For non-capture group queries we just return replaceQuery verbatim;
        // capture-group support ($1, $2) is out of scope (see spec §Out-of-scope).
        return replaceQuery;
      });
      if (count > 0) {
        setContent(path, replaced);
        replacedFiles++;
        replacedTotal += count;
      }
    }
    toast.success(
      `Đã thay ${replacedTotal} lần trong ${replacedFiles} tệp. Ctrl+S để lưu.`,
    );
  }, [compiledRegex, groupedMatches.size, projectMatches.length, files, drafts, replaceQuery, setContent]);

  /* ── Auto-focus on Ctrl+F via workspace event ─────────────────────────── */

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { focus?: "find" | "replace" } | undefined;
      const inputId = detail?.focus === "replace" ? "search-replace-input" : "search-query-input";
      setTimeout(() => {
        const input = document.getElementById(inputId) as HTMLInputElement | null;
        input?.focus();
        input?.select();
      }, 50);
      if (detail?.focus === "replace") setShowReplace(true);
    };
    window.addEventListener("search:focus", handler);
    return () => window.removeEventListener("search:focus", handler);
  }, []);

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      {/* ── Search input ── */}
      <div className="p-3 border-b border-slate-200 shrink-0 bg-white space-y-2">
        {/* Scope toggle */}
        <div className="flex overflow-hidden rounded-md border border-slate-200 text-[10px] font-semibold leading-tight">
          <button
            onClick={() => setSearchScope("current")}
            className={`flex-1 whitespace-nowrap px-1.5 py-1 transition-colors ${
              searchScope === "current"
                ? "bg-[#007bff] text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Tệp hiện tại
          </button>
          <button
            onClick={() => setSearchScope("all")}
            className={`flex-1 whitespace-nowrap border-l border-slate-200 px-1.5 py-1 transition-colors ${
              searchScope === "all"
                ? "bg-[#007bff] text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Toàn bộ dự án
          </button>
        </div>

        {/* Search field */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            id="search-query-input"
            type="text"
            placeholder={regex ? "Biểu thức chính quy..." : "Tìm kiếm..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchScope === "current") {
                e.preventDefault();
                e.shiftKey ? handleFindPrev() : handleFindNext();
              }
            }}
            aria-invalid={regexError !== null}
            className={`pl-8 pr-28 py-1 text-sm h-8 ${
              regexError ? "border-red-500 focus:border-red-500" : ""
            }`}
            autoFocus
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <button
              onClick={() => setCaseSensitive((v) => !v)}
              title="Phân biệt hoa thường (Aa)"
              aria-pressed={caseSensitive}
              className={`p-1 rounded transition-colors ${
                caseSensitive
                  ? "bg-blue-100 text-[#007bff]"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              }`}
            >
              <CaseSensitive className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setWholeWord((v) => !v)}
              title="Cả từ"
              aria-pressed={wholeWord}
              className={`p-1 rounded transition-colors ${
                wholeWord
                  ? "bg-blue-100 text-[#007bff]"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              }`}
            >
              <WholeWord className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setRegex((v) => !v)}
              title="Biểu thức chính quy (.*)"
              aria-pressed={regex}
              className={`p-1 rounded transition-colors ${
                regex
                  ? "bg-blue-100 text-[#007bff]"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Regex className="w-3.5 h-3.5" />
            </button>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="p-1 text-slate-400 hover:text-slate-600"
                title="Xoá"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {regexError && (
          <p className="text-[11px] text-red-600">{regexError}</p>
        )}

        {/* Replace toggle */}
        <button
          onClick={() => setShowReplace((v) => !v)}
          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 transition-colors"
        >
          <Replace className="w-3 h-3" />
          {showReplace ? "Ẩn thay thế" : "Thay thế"}
        </button>

        {/* Replace field */}
        {showReplace && (
          <div className="relative">
            <Replace className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              id="search-replace-input"
              type="text"
              placeholder="Thay thế bằng..."
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              className="pl-8 py-1 text-sm h-8"
            />
          </div>
        )}

        {/* Action buttons – current file */}
        {searchScope === "current" && searchQuery && !regexError && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] text-slate-500 mr-1">
              {currentFileMatchCount} kết quả
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[11px]"
              onClick={handleFindPrev}
              title="Kết quả trước (Shift+Enter)"
            >
              <ChevronUp className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[11px]"
              onClick={handleFindNext}
              title="Kết quả tiếp theo (Enter)"
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
            {showReplace && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[11px]"
                  onClick={handleReplaceNext}
                >
                  Thay 1
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[11px]"
                  onClick={handleReplaceAll}
                >
                  Thay tất cả
                </Button>
              </>
            )}
          </div>
        )}

        {/* Action: replace all in project */}
        {searchScope === "all" && showReplace && searchQuery && !regexError && projectMatches.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-full text-[11px]"
            onClick={handleReplaceAllInProject}
          >
            Thay {projectMatches.length} kết quả trong {groupedMatches.size} tệp
          </Button>
        )}
      </div>

      {/* ── Results ── */}
      <div className="flex-1 overflow-y-auto">
        {!searchQuery && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-slate-400">Nhập từ khóa để tìm kiếm</p>
          </div>
        )}

        {searchQuery && searchScope === "current" && !regexError && (
          <div className="p-3">
            <p className="text-[11px] text-slate-500">
              {currentFileMatchCount > 0
                ? `Tìm thấy ${currentFileMatchCount} kết quả trong tệp hiện tại. Dùng ↑↓ để điều hướng.`
                : "Không tìm thấy kết quả trong tệp hiện tại."}
            </p>
          </div>
        )}

        {searchQuery && searchScope === "all" && !regexError && (
          <>
            {groupedMatches.size === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-slate-400">Không tìm thấy kết quả</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {[...groupedMatches.entries()].map(([filePath, matches]) => (
                  <div key={filePath}>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border-b border-slate-100 sticky top-0">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-[12px] font-medium text-slate-700 truncate">
                        {filePath}
                      </span>
                      <span className="ml-auto text-[11px] text-slate-400 shrink-0">
                        {matches.length}
                      </span>
                    </div>
                    {matches.map((m, i) => (
                      <button
                        key={i}
                        onClick={() => handleMatchClick(m)}
                        className="w-full text-left flex items-start gap-2 px-3 py-1.5 hover:bg-blue-50 transition-colors group"
                      >
                        <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-slate-300 group-hover:text-[#007bff]" />
                        <div className="min-w-0">
                          <span className="text-[11px] text-slate-400 mr-2">
                            {m.line}:{m.column}
                          </span>
                          <span
                            className="text-[12px] text-slate-700 font-mono truncate"
                            dangerouslySetInnerHTML={{
                              __html: highlightPreview(m.preview, m.matchStart, m.matchLength),
                            }}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
                {projectMatches.length >= 200 && (
                  <p className="text-[11px] text-slate-400 px-3 py-2 text-center">
                    Hiển thị 200 kết quả đầu tiên
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
