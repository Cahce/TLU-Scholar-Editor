/**
 * OpenAlexResultCard Component
 * 
 * Card displaying a single OpenAlex work result.
 */

import { ExternalLink, Quote, Save } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { useInsertCitation } from "../../hooks/useInsertCitation";
import { toast } from "sonner";
import type { OpenAlexWork } from "../../../types/bibliography";

interface OpenAlexResultCardProps {
  work: OpenAlexWork;
  onSave: (workId: string) => void;
}

export function OpenAlexResultCard({ work, onSave }: OpenAlexResultCardProps) {
  const insertCitation = useInsertCitation();

  const handleInsertCitation = () => {
    // Generate a simple citation key from the work
    const firstAuthor = work.authors[0]?.name.split(" ").pop() || "Unknown";
    const year = work.year || "n.d.";
    const titleWord = work.title?.split(" ")[0]?.replace(/[^a-zA-Z]/g, "") || "Work";
    const key = `${firstAuthor}${year}${titleWord}`;

    const success = insertCitation(key);
    if (success) {
      toast.success(`Đã chèn trích dẫn: ${key}`);
    } else {
      toast.error("Không thể chèn trích dẫn. Vui lòng mở một file Typst.");
    }
  };

  const formatAuthors = (): string => {
    if (work.authors.length === 0) return "Không có tác giả";
    
    const authors = work.authors.slice(0, 4).map((a) => a.name);
    if (work.authors.length > 4) {
      authors.push("et al.");
    }
    
    return authors.join(", ");
  };

  return (
    <div className="p-3 border-b border-slate-200 hover:bg-slate-50 transition-colors">
      <div className="space-y-2">
        {/* Title */}
        <h4 className="text-sm font-medium text-slate-900 leading-snug">
          {work.landingUrl ? (
            <a
              href={work.landingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#007bff] inline-flex items-center gap-1"
            >
              {work.title || "Không có tiêu đề"}
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            work.title || "Không có tiêu đề"
          )}
        </h4>

        {/* Authors */}
        <p className="text-xs text-slate-600">{formatAuthors()}</p>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {work.year && <span>{work.year}</span>}
          {work.journal && (
            <>
              <span>•</span>
              <span className="italic">{work.journal}</span>
            </>
          )}
          <span>•</span>
          <span>cited {work.citedByCount}</span>
        </div>

        {/* Abstract */}
        {work.abstract && (
          <p className="text-xs text-slate-600 line-clamp-3">{work.abstract}</p>
        )}

        {/* Badges */}
        <div className="flex items-center gap-2">
          {work.doi && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded">
              DOI
            </span>
          )}
          {work.isOA && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
              Open Access
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleInsertCitation}
            className="text-xs"
          >
            <Quote className="w-3 h-3 mr-1" />
            Chèn trích dẫn
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSave(work.id)}
            className="text-xs"
          >
            <Save className="w-3 h-3 mr-1" />
            Lưu vào .bib
          </Button>
        </div>
      </div>
    </div>
  );
}
