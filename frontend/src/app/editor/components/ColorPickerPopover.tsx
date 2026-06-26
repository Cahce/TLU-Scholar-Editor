import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Button } from "../../components/ui/button";
import { cn } from "../../components/ui/utils";

/**
 * Inspired by TeXlyre's color picker: commit-on-confirm UX, no auto-insert
 * during drag. The picker only mutates the document when the user clicks a
 * preset swatch OR confirms a custom colour via "Áp dụng". Closing the
 * popover (Esc / click-outside / Hủy) discards the pending colour.
 */
interface Props {
  /** Currently selected colour (controls the swatch / input default). */
  value?: string;
  /** Invoked with the chosen hex string when the user confirms. */
  onApply: (hex: string) => void;
  /** Trigger element (toolbar button). */
  children: React.ReactNode;
  ariaLabel?: string;
}

const PRESET_COLORS = [
  "#000000", "#ffffff", "#dc2626", "#ea580c",
  "#f59e0b", "#16a34a", "#0891b2", "#2563eb",
  "#7c3aed", "#db2777", "#475569", "#94a3b8",
  "#fbbf24", "#a3e635", "#22d3ee", "#a78bfa",
] as const;

function normaliseHex(hex: string): string {
  const trimmed = hex.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return "";
}

export function ColorPickerPopover({
  value = "#000000",
  onApply,
  children,
  ariaLabel,
}: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string>(value);
  const [hexInput, setHexInput] = useState<string>(value);

  // Reset pending state every time the popover opens so users always start
  // from the current value, not a stale draft from a previous session.
  useEffect(() => {
    if (open) {
      setPending(value);
      setHexInput(value);
    }
  }, [open, value]);

  const commit = useCallback(
    (hex: string) => {
      const normalised = normaliseHex(hex);
      if (!normalised) return;
      onApply(normalised);
      setOpen(false);
    },
    [onApply],
  );

  function handleHexInputBlur() {
    const normalised = normaliseHex(hexInput);
    if (normalised) {
      setPending(normalised);
      setHexInput(normalised);
    } else {
      // Invalid input — revert to last valid pending.
      setHexInput(pending);
    }
  }

  function handleConfirm() {
    commit(pending);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild aria-label={ariaLabel}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div
              className="size-8 rounded border border-slate-200 shadow-sm"
              style={{ backgroundColor: pending }}
              aria-label={`Color preview ${pending}`}
            />
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onBlur={handleHexInputBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleHexInputBlur();
                  handleConfirm();
                }
              }}
              spellCheck={false}
              className="flex-1 rounded border border-slate-200 px-2 py-1 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="#000000"
              aria-label="Hex color"
            />
            {/*
              Native picker as the "advanced" path. The native control
              fires `input` continuously during drag; we mirror that into
              `pending` so the preview updates in real-time but the
              DOCUMENT is untouched until the user clicks "Áp dụng".
            */}
            <label
              className="size-8 cursor-pointer rounded border border-slate-200 shadow-sm overflow-hidden"
              style={{ backgroundColor: pending }}
              title="Mở bảng chọn màu hệ thống"
            >
              <input
                type="color"
                value={pending}
                onChange={(e) => {
                  setPending(e.target.value);
                  setHexInput(e.target.value);
                }}
                className="sr-only"
                aria-label="System color picker"
              />
            </label>
          </div>

          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              Màu có sẵn
            </div>
            <div className="grid grid-cols-8 gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => commit(c)}
                  className={cn(
                    "size-6 rounded border border-slate-200 transition-transform hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500",
                    pending.toLowerCase() === c.toLowerCase() &&
                      "ring-2 ring-blue-500 scale-110",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Apply ${c}`}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="gap-1"
            >
              <X className="size-3.5" />
              Hủy
            </Button>
            <Button size="sm" onClick={handleConfirm} className="gap-1">
              <Check className="size-3.5" />
              Áp dụng
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
