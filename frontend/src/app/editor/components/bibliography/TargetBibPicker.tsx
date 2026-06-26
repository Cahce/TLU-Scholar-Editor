/**
 * TargetBibPicker
 *
 * Chooses a bibliography target. Uses the same reference-aware target
 * detection as Zotero/OpenAlex panels, so `#bibliography("ref.yml")` wins
 * over arbitrary first-file ordering.
 */

import { useState } from "react";
import { Label } from "../../../components/ui/label";
import { useBibFiles } from "../../hooks/useBibFiles";
import { useBibTargetPath } from "../../hooks/useBibTargetPath";
import { detectBibFormat, formatLabel, isBibPath } from "../../lib/bibFormat";

interface TargetBibPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function TargetBibPicker({ value, onChange }: TargetBibPickerProps) {
  const { bibFiles } = useBibFiles();
  const { suggestedPath } = useBibTargetPath();
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === "__new__") {
      setIsCreatingNew(true);
      onChange(suggestedPath);
    } else {
      setIsCreatingNew(false);
      onChange(selectedValue);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="targetBib">File bibliography dich</Label>

      {!isCreatingNew && bibFiles.length > 0 ? (
        <select
          id="targetBib"
          value={value}
          onChange={(e) => handleSelectChange(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007bff]"
        >
          {bibFiles.map((file) => {
            const format = detectBibFormat(file.path) ?? "bibtex";
            return (
              <option key={file.path} value={file.path}>
                {file.path} ({formatLabel(format)})
              </option>
            );
          })}
          <option value="__new__">+ Tao file moi...</option>
        </select>
      ) : (
        <div className="space-y-2">
          <input
            id="targetBib"
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={suggestedPath}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007bff]"
          />
          {!isBibPath(value) && value.length > 0 && (
            <p className="text-xs text-red-600">
              Duong dan phai ket thuc bang .bib, .yml hoac .yaml
            </p>
          )}
          {bibFiles.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setIsCreatingNew(false);
                onChange(suggestedPath);
              }}
              className="text-xs text-[#007bff] hover:underline"
            >
              Chon file duoc #bibliography tham chieu
            </button>
          )}
        </div>
      )}
    </div>
  );
}
