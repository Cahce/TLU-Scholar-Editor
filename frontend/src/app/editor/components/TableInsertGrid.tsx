import { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { cn } from "../../components/ui/utils";

const MAX_ROWS = 8;
const MAX_COLS = 8;

interface Props {
  disabled?: boolean;
  /** `rows` is the total row count including the header when `withHeader`. */
  onPick: (rows: number, columns: number, withHeader: boolean) => void;
  /** Trigger button (rendered via Radix `asChild`). */
  children: React.ReactNode;
}

/**
 * Word-style table size picker: hover (or arrow-key) over an 8×8 grid to
 * choose R×C, optional header row. Keyboard: arrows move the highlight,
 * Enter confirms, Esc closes (Radix default).
 */
export function TableInsertGrid({
  disabled = false,
  onPick,
  children,
}: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState({ rows: 3, cols: 3 });
  const [withHeader, setWithHeader] = useState(true);

  function pick(rows: number, cols: number): void {
    onPick(rows, cols, withHeader);
    setOpen(false);
  }

  function onGridKeyDown(e: React.KeyboardEvent): void {
    const { rows, cols } = sel;
    let next: { rows: number; cols: number } | null = null;
    if (e.key === "ArrowRight") next = { rows, cols: Math.min(cols + 1, MAX_COLS) };
    else if (e.key === "ArrowLeft") next = { rows, cols: Math.max(cols - 1, 1) };
    else if (e.key === "ArrowDown") next = { rows: Math.min(rows + 1, MAX_ROWS), cols };
    else if (e.key === "ArrowUp") next = { rows: Math.max(rows - 1, 1), cols };
    else if (e.key === "Enter") {
      e.preventDefault();
      pick(rows, cols);
      return;
    } else {
      return;
    }
    e.preventDefault();
    setSel(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <div className="space-y-2">
          <div
            role="grid"
            aria-label="Chọn kích thước bảng — dùng phím mũi tên rồi Enter"
            tabIndex={0}
            onKeyDown={onGridKeyDown}
            className="grid gap-0.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 1fr)` }}
          >
            {Array.from({ length: MAX_ROWS * MAX_COLS }).map((_, i) => {
              const r = Math.floor(i / MAX_COLS) + 1;
              const c = (i % MAX_COLS) + 1;
              const active = r <= sel.rows && c <= sel.cols;
              return (
                <button
                  key={i}
                  type="button"
                  tabIndex={-1}
                  aria-label={`Bảng ${r} hàng ${c} cột`}
                  onMouseEnter={() => setSel({ rows: r, cols: c })}
                  onClick={() => pick(r, c)}
                  className={cn(
                    "size-5 rounded-[3px] border transition-colors",
                    active
                      ? "border-blue-400 bg-blue-100"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                    withHeader && active && r === 1 && "bg-blue-200",
                  )}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-700" aria-live="polite">
              {sel.rows} × {sel.cols}
            </span>
            <label className="flex items-center gap-1.5 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={withHeader}
                onChange={(e) => setWithHeader(e.target.checked)}
              />
              Hàng tiêu đề
            </label>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
