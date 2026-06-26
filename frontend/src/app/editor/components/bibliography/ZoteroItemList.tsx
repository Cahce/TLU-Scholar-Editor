/**
 * ZoteroItemList Component
 * 
 * Displays list of Zotero items with pagination.
 */

import { useState } from "react";
import { Quote, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../../components/ui/button";
import type { ZoteroItem } from "../../../types/bibliography";

interface ZoteroItemListProps {
  items: ZoteroItem[];
  total: number;
  page: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onSync: (itemKeys: string[]) => void;
  /**
   * Insert a citation for the given Zotero item. The parent is responsible
   * for syncing the item into the project .bib first so the citation key
   * actually resolves (see `ZoteroPanel.handleInsertCitation`).
   */
  onInsert: (item: ZoteroItem) => Promise<void>;
  /** Message shown when the list is empty (context-specific guidance). */
  emptyMessage?: string;
}

export function ZoteroItemList({
  items,
  total,
  page,
  loading,
  onPageChange,
  onSync,
  onInsert,
  emptyMessage,
}: ZoteroItemListProps) {
  const itemsPerPage = 50;
  const totalPages = Math.ceil(total / itemsPerPage);
  // Disable the per-row Chèn button while its sync-and-insert is in flight,
  // otherwise a double-click can fire two sync calls and noise up the .bib.
  const [insertingKey, setInsertingKey] = useState<string | null>(null);

  const handleInsertCitation = async (item: ZoteroItem) => {
    if (insertingKey) return;
    setInsertingKey(item.key);
    try {
      await onInsert(item);
    } finally {
      setInsertingKey(null);
    }
  };

  const formatAuthors = (item: ZoteroItem): string => {
    if (item.creators.length === 0) return "Không có tác giả";
    
    const authors = item.creators
      .filter((c) => c.creatorType === "author")
      .slice(0, 3)
      .map((c) => {
        if (c.name) return c.name;
        return [c.firstName, c.lastName].filter(Boolean).join(" ");
      });

    if (item.creators.length > 3) {
      authors.push("...");
    }

    return authors.join(", ");
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm text-slate-500">Đang tải...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm text-slate-500 text-center leading-relaxed">
          {emptyMessage ?? "Không có tài liệu nào"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* See OpenAlexResultList for rationale on plain overflow vs Radix. */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <ul className="divide-y divide-slate-200">
          {items.map((item) => (
            <li key={item.key} className="p-3 hover:bg-slate-50 transition-colors">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-900 line-clamp-2">
                  {item.title || "Không có tiêu đề"}
                </h4>
                <p className="text-xs text-slate-600">
                  {formatAuthors(item)}
                  {item.date && ` • ${item.date}`}
                </p>
                {item.publicationTitle && (
                  <p className="text-xs text-slate-500 italic">
                    {item.publicationTitle}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleInsertCitation(item)}
                    disabled={insertingKey === item.key}
                    className="text-xs"
                  >
                    <Quote className="w-3 h-3 mr-1" />
                    {insertingKey === item.key ? "Đang chèn..." : "Chèn"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSync([item.key])}
                    className="text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Đồng bộ
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {totalPages > 1 && (
        <div className="border-t border-slate-200 p-3 flex items-center justify-between">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-600">
            Trang {page + 1} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
