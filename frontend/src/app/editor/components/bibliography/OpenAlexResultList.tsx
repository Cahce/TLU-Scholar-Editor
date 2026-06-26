/**
 * OpenAlexResultList Component
 * 
 * List of OpenAlex search results with pagination.
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { OpenAlexResultCard } from "./OpenAlexResultCard";
import type { OpenAlexWork } from "../../../types/bibliography";

interface OpenAlexResultListProps {
  works: OpenAlexWork[];
  meta?: {
    count: number;
    page: number;
    perPage: number;
  };
  onPageChange: (page: number) => void;
  onSave: (workId: string) => void;
}

export function OpenAlexResultList({
  works,
  meta,
  onPageChange,
  onSave,
}: OpenAlexResultListProps) {
  if (works.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm text-slate-500">Không tìm thấy kết quả</p>
      </div>
    );
  }

  const totalPages = meta ? Math.ceil(meta.count / meta.perPage) : 1;
  const currentPage = meta?.page || 1;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Plain `overflow-y-auto` instead of Radix ScrollArea — Radix's
          viewport relies on a definite computed height from the parent
          chain, which is brittle when the panel is nested several flex
          levels deep. A native scrollable div always works as long as the
          parent has `min-h-0`. */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {works.map((work) => (
          <OpenAlexResultCard key={work.id} work={work} onSave={onSave} />
        ))}
      </div>

      {meta && totalPages > 1 && (
        <div className="border-t border-slate-200 p-3 flex items-center justify-between shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-600">
            Trang {currentPage} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
