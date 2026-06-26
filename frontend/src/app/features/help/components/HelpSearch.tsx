import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Search, X } from "lucide-react";
import { cn } from "../../../components/ui/utils";
import { searchTopics } from "../helpContent";

/** Ô tìm kiếm chủ đề trong Trung tâm trợ giúp (client-side, không gọi backend). */
export function HelpSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => (query.trim() ? searchTopics(query) : []), [query]);
  const showPanel = open && query.trim().length > 0;

  const go = (slug: string) => {
    setOpen(false);
    setQuery("");
    navigate(`/huong-dan/${slug}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPanel) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = results[activeIndex];
      if (selected) go(selected.slug);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="help-search-results"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Tìm trong tài liệu (cú pháp, tiếng Việt, trích dẫn, PDF...)"
          className="w-full h-11 pl-10 pr-10 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
        {query && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Xoá tìm kiếm"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showPanel && (
        <div
          id="help-search-results"
          role="listbox"
          className="absolute z-30 mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden"
        >
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              Không tìm thấy kết quả cho <span className="font-medium text-slate-700">“{query}”</span>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((topic, index) => (
                <li key={topic.slug} role="option" aria-selected={index === activeIndex}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => go(topic.slug)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors",
                      index === activeIndex ? "bg-blue-50" : "hover:bg-slate-50",
                    )}
                  >
                    <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#007bff] flex items-center justify-center shrink-0">
                      <topic.icon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900 truncate">
                        {topic.title}
                      </span>
                      <span className="block text-xs text-slate-500 line-clamp-1">{topic.summary}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
