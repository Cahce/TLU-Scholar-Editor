/**
 * BibEntryPreview Component
 * 
 * Preview component for bibliography entries.
 */

import { ExternalLink } from "lucide-react";
import type { ZoteroItem, OpenAlexWork } from "../../../types/bibliography";

interface BibEntryPreviewProps {
  kind: "zotero" | "openalex";
  data: ZoteroItem | OpenAlexWork;
}

export function BibEntryPreview({ kind, data }: BibEntryPreviewProps) {
  if (kind === "zotero") {
    const item = data as ZoteroItem;
    
    const formatAuthors = () => {
      if (item.creators.length === 0) return "Không có tác giả";
      return item.creators
        .map((c) => {
          if (c.name) return c.name;
          return [c.firstName, c.lastName].filter(Boolean).join(" ");
        })
        .join(", ");
    };

    return (
      <div className="space-y-3 p-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-1">
            {item.title || "Không có tiêu đề"}
          </h4>
          <p className="text-xs text-slate-600">{item.itemType}</p>
        </div>

        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium text-slate-700">Tác giả:</span>{" "}
            <span className="text-slate-600">{formatAuthors()}</span>
          </div>

          {item.date && (
            <div>
              <span className="font-medium text-slate-700">Năm:</span>{" "}
              <span className="text-slate-600">{item.date}</span>
            </div>
          )}

          {item.publicationTitle && (
            <div>
              <span className="font-medium text-slate-700">Xuất bản:</span>{" "}
              <span className="text-slate-600 italic">{item.publicationTitle}</span>
            </div>
          )}

          {item.doi && (
            <div>
              <span className="font-medium text-slate-700">DOI:</span>{" "}
              <span className="text-slate-600">{item.doi}</span>
            </div>
          )}

          {item.url && (
            <div>
              <span className="font-medium text-slate-700">URL:</span>{" "}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#007bff] hover:underline inline-flex items-center gap-1"
              >
                {item.url}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {item.abstractNote && (
            <div>
              <span className="font-medium text-slate-700">Tóm tắt:</span>
              <p className="text-slate-600 mt-1 text-xs leading-relaxed">
                {item.abstractNote}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // OpenAlex work
  const work = data as OpenAlexWork;
  
  const formatAuthors = () => {
    if (work.authors.length === 0) return "Không có tác giả";
    const authors = work.authors.slice(0, 5).map((a) => a.name);
    if (work.authors.length > 5) {
      authors.push("et al.");
    }
    return authors.join(", ");
  };

  return (
    <div className="space-y-3 p-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-1">
          {work.title || "Không có tiêu đề"}
        </h4>
        <p className="text-xs text-slate-600">{work.type}</p>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium text-slate-700">Tác giả:</span>{" "}
          <span className="text-slate-600">{formatAuthors()}</span>
        </div>

        {work.year && (
          <div>
            <span className="font-medium text-slate-700">Năm:</span>{" "}
            <span className="text-slate-600">{work.year}</span>
          </div>
        )}

        {work.journal && (
          <div>
            <span className="font-medium text-slate-700">Tạp chí:</span>{" "}
            <span className="text-slate-600 italic">{work.journal}</span>
          </div>
        )}

        {(work.volume || work.issue || work.pages) && (
          <div>
            <span className="font-medium text-slate-700">Chi tiết:</span>{" "}
            <span className="text-slate-600">
              {[
                work.volume && `Vol. ${work.volume}`,
                work.issue && `No. ${work.issue}`,
                work.pages && `pp. ${work.pages}`,
              ]
                .filter(Boolean)
                .join(", ")}
            </span>
          </div>
        )}

        {work.doi && (
          <div>
            <span className="font-medium text-slate-700">DOI:</span>{" "}
            <span className="text-slate-600">{work.doi}</span>
          </div>
        )}

        <div>
          <span className="font-medium text-slate-700">Trích dẫn:</span>{" "}
          <span className="text-slate-600">{work.citedByCount}</span>
        </div>

        {work.isOA && (
          <div>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
              Open Access
            </span>
          </div>
        )}

        {work.landingUrl && (
          <div>
            <span className="font-medium text-slate-700">URL:</span>{" "}
            <a
              href={work.landingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#007bff] hover:underline inline-flex items-center gap-1"
            >
              {work.landingUrl}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {work.abstract && (
          <div>
            <span className="font-medium text-slate-700">Tóm tắt:</span>
            <p className="text-slate-600 mt-1 text-xs leading-relaxed">
              {work.abstract}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
