/**
 * OpenAlexSearchBar Component
 * 
 * Search bar for OpenAlex works.
 */

import { Search } from "lucide-react";
import { Input } from "../../../components/ui/input";

interface OpenAlexSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function OpenAlexSearchBar({ value, onChange }: OpenAlexSearchBarProps) {
  return (
    <div className="p-3 border-b border-slate-200 bg-white shrink-0">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tìm bài báo, sách, luận án..."
          className="pl-10"
        />
      </div>
    </div>
  );
}
