import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Hash, Sigma } from "lucide-react";
import { useEditorStore } from "../state/editorStore";
import {
  getOutlineAutoHighlight,
  subscribeSettings,
} from "../state/previewSettings";

interface Heading {
  level: number;
  text: string;
  line: number;
}

/**
 * Parse Typst section headings from document content.
 * Typst uses = for h1, == for h2, === for h3, etc.
 */
function parseTypstHeadings(content: string): Heading[] {
  const headings: Heading[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    // Match lines that start with one or more '=' followed by a space and text.
    const match = lines[i].match(/^(=+)\s+(.+)/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        line: i + 1,
      });
    }
  }

  return headings;
}

export function OutlinePanel(): JSX.Element {
  const activePath = useEditorStore((s) => s.activePath);
  const drafts = useEditorStore((s) => s.drafts);
  const files = useEditorStore((s) => s.files);
  const activeOutlineLine = useEditorStore((s) => s.activeOutlineLine);

  // Setting can change from EditorSettingsPanel without remounting — re-read on
  // notification so the highlight updates immediately.
  const [autoHighlight, setAutoHighlight] = useState(() => getOutlineAutoHighlight());
  useEffect(() => {
    return subscribeSettings(() => {
      setAutoHighlight(getOutlineAutoHighlight());
    });
  }, []);

  // Prefer draft content (unsaved edits) over stored file content
  const content = activePath
    ? (drafts[activePath]?.content ?? files[activePath]?.textContent ?? "")
    : "";

  const headings = useMemo(() => parseTypstHeadings(content), [content]);

  // Normalise indentation so the shallowest heading sits at level 0
  const minLevel = headings.length > 0 ? Math.min(...headings.map((h) => h.level)) : 1;

  // Find which heading is "active" — the heading with the largest `line`
  // value that is still ≤ activeOutlineLine. Returns -1 when off / no match.
  const activeIndex = useMemo(() => {
    if (!autoHighlight || activeOutlineLine == null || headings.length === 0) return -1;
    let best = -1;
    for (let i = 0; i < headings.length; i++) {
      if (headings[i].line <= activeOutlineLine) best = i;
      else break;
    }
    return best;
  }, [autoHighlight, activeOutlineLine, headings]);

  // Auto-scroll the active heading button into view when it changes.
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  useEffect(() => {
    if (activeIndex < 0) return;
    const el = buttonRefs.current.get(activeIndex);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeIndex]);

  const setButtonRef = useCallback(
    (idx: number) => (el: HTMLButtonElement | null) => {
      if (el) buttonRefs.current.set(idx, el);
      else buttonRefs.current.delete(idx);
    },
    [],
  );

  const handleJump = (line: number): void => {
    window.dispatchEvent(
      new CustomEvent("editor:jumpTo", { detail: { line, column: 1 } }),
    );
  };

  const handleLineHover = (line: number | null): void => {
    window.dispatchEvent(
      new CustomEvent("editor:outlineHover", { detail: { line } }),
    );
  };

  const openWordCount = (): void => {
    window.dispatchEvent(new CustomEvent("editor:openWordCount"));
  };

  const Header = (): JSX.Element => (
    <div className="flex items-center justify-between border-b border-slate-200 bg-[#f8fafc] px-3 py-1.5 shrink-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Dàn ý
      </span>
      <button
        type="button"
        onClick={openWordCount}
        title="Đếm từ"
        aria-label="Đếm từ"
        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#007bff] focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
      >
        <Sigma className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  if (!activePath) {
    return (
      <div className="flex flex-1 flex-col min-h-0 bg-[#f8fafc]">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">Chưa chọn tệp</p>
          </div>
        </div>
      </div>
    );
  }

  if (headings.length === 0) {
    return (
      <div className="flex flex-1 flex-col min-h-0 bg-[#f8fafc]">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-slate-400">
            <Hash className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">Không có tiêu đề</p>
            <p className="text-[11px] mt-2 text-slate-400">
              Thêm tiêu đề bằng cú pháp Typst:
              <br />
              <code className="bg-slate-100 px-1 rounded text-slate-600 font-mono">
                = Tiêu đề chính
              </code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-[#f8fafc]">
      <Header />
      <div className="flex-1 overflow-y-auto py-2">
      {headings.map((heading, i) => {
        const indent = (heading.level - minLevel) * 14;
        const isH1 = heading.level === minLevel;
        const isH2 = heading.level === minLevel + 1;
        const isActive = i === activeIndex;

        return (
          <button
            key={`${heading.line}-${i}`}
            ref={setButtonRef(i)}
            onClick={() => handleJump(heading.line)}
            onPointerEnter={() => handleLineHover(heading.line)}
            onPointerLeave={() => handleLineHover(null)}
            onFocus={() => handleLineHover(heading.line)}
            onBlur={() => handleLineHover(null)}
            aria-current={isActive ? "location" : undefined}
            title={`Dòng ${heading.line}: ${heading.text}`}
            className={`group flex w-full items-start gap-1.5 rounded-sm py-1 text-left transition-colors focus:outline-none ${
              isActive
                ? "bg-blue-50 text-[#007bff]"
                : "hover:bg-blue-50 hover:text-[#007bff] focus:bg-blue-50 focus:text-[#007bff]"
            }`}
            style={{ paddingLeft: `${indent + 12}px`, paddingRight: "12px" }}
          >
            <Hash
              className={`w-3 h-3 mt-0.5 shrink-0 transition-colors ${
                isActive || isH1
                  ? "text-[#007bff]"
                  : "text-slate-300 group-hover:text-[#007bff]"
              }`}
            />
            <span
              className={`text-[13px] leading-snug truncate ${
                isActive
                  ? "font-semibold text-[#007bff]"
                  : isH1
                    ? "font-semibold text-slate-800"
                    : isH2
                      ? "font-medium text-slate-700"
                      : "text-slate-600"
              } group-hover:text-[#007bff]`}
            >
              {heading.text}
            </span>
          </button>
        );
      })}
      </div>
    </div>
  );
}
