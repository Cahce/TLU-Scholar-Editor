/**
 * OpenAlexFilters Component
 * 
 * Filters for OpenAlex search.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Checkbox } from "../../../components/ui/checkbox";
import type { OpenAlexSearchQuery } from "../../../types/bibliography";

interface OpenAlexFiltersProps {
  query: OpenAlexSearchQuery;
  onChange: (query: OpenAlexSearchQuery) => void;
}

export function OpenAlexFilters({ query, onChange }: OpenAlexFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleYearFromChange = (value: string) => {
    const year = value ? parseInt(value, 10) : undefined;
    onChange({ ...query, yearFrom: year, page: 1 });
  };

  const handleYearToChange = (value: string) => {
    const year = value ? parseInt(value, 10) : undefined;
    onChange({ ...query, yearTo: year, page: 1 });
  };

  const handleOAChange = (checked: boolean) => {
    onChange({ ...query, isOA: checked || undefined, page: 1 });
  };

  const handleTypeChange = (value: string) => {
    onChange({ ...query, type: value || undefined, page: 1 });
  };

  return (
    <div className="border-b border-slate-200 bg-white shrink-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-sm text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span className="font-medium">Bộ lọc</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="yearFrom" className="text-xs">
                Năm từ
              </Label>
              <Input
                id="yearFrom"
                type="number"
                min="1500"
                max="2100"
                value={query.yearFrom || ""}
                onChange={(e) => handleYearFromChange(e.target.value)}
                placeholder="1990"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="yearTo" className="text-xs">
                Năm đến
              </Label>
              <Input
                id="yearTo"
                type="number"
                min="1500"
                max="2100"
                value={query.yearTo || ""}
                onChange={(e) => handleYearToChange(e.target.value)}
                placeholder="2024"
                className="text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isOA"
              checked={query.isOA || false}
              onCheckedChange={handleOAChange}
            />
            <Label htmlFor="isOA" className="text-sm cursor-pointer">
              Chỉ Open Access
            </Label>
          </div>

          <div className="space-y-1">
            <Label htmlFor="type" className="text-xs">
              Loại tài liệu
            </Label>
            <select
              id="type"
              value={query.type || ""}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#007bff]"
            >
              <option value="">Tất cả</option>
              <option value="article">Bài báo</option>
              <option value="book">Sách</option>
              <option value="book-chapter">Chương sách</option>
              <option value="dissertation">Luận án</option>
              <option value="proceedings-article">Bài hội nghị</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
