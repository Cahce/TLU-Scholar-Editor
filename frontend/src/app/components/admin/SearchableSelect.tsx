import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "../ui/popover";
import { cn } from "../ui/utils";

/**
 * Strip Vietnamese diacritics + lowercase for forgiving search matching.
 */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export interface SearchableSelectProps<T> {
  value: string;
  onChange: (value: string) => void;
  options: T[];
  getOptionValue: (option: T) => string;
  getOptionLabel: (option: T) => string;
  getOptionSubLabel?: (option: T) => string | undefined;
  placeholder?: string;
  /** @deprecated kept for API compat; input itself is the search field now. */
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
  id?: string;
}

/**
 * Combobox with an editable input as the trigger: typing filters the list
 * in real-time (Vietnamese-diacritic-insensitive). Selecting an item commits
 * the value; clearing the input + clicking another option swaps selection.
 *
 * Clicking inside the trigger (input or chevron) while the popover is already
 * open does NOT close+reopen it (no jarring re-animation). Text selection
 * inside the input is preserved.
 */
export function SearchableSelect<T>({
  value,
  onChange,
  options,
  getOptionValue,
  getOptionLabel,
  getOptionSubLabel,
  placeholder = "-- Chọn --",
  emptyMessage = "Không tìm thấy",
  disabled,
  hasError,
  className,
  id,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Unique data-attr value so the dismissable layer can scope its match to
  // THIS instance only (multiple SearchableSelects on the same page coexist).
  const anchorId = useId();

  const selectedOption = useMemo(
    () => options.find((opt) => getOptionValue(opt) === value),
    [options, value, getOptionValue],
  );
  const selectedLabel = selectedOption ? getOptionLabel(selectedOption) : "";

  // When editing → show typed query. Otherwise → show selected label.
  const displayValue = editing ? query : selectedLabel;

  const filteredOptions = useMemo(() => {
    if (!editing || query.trim() === "") return options;
    const q = fold(query);
    return options.filter((opt) => {
      const label = fold(getOptionLabel(opt));
      const sub = fold(getOptionSubLabel?.(opt) ?? "");
      return label.includes(q) || sub.includes(q);
    });
  }, [editing, query, options, getOptionLabel, getOptionSubLabel]);

  // Reset highlight when filter changes or popover (re)opens.
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, open]);

  // Scroll highlighted item into view.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelector<HTMLLIElement>(
      `[data-index="${highlightedIndex}"]`,
    );
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, open]);

  const commitSelect = (opt: T) => {
    onChange(getOptionValue(opt));
    setQuery("");
    setEditing(false);
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.blur());
  };

  const handleOpenChange = (next: boolean) => {
    if (disabled) return;
    setOpen(next);
    if (!next) {
      setEditing(false);
      setQuery("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlightedIndex((i) =>
        filteredOptions.length === 0 ? 0 : Math.min(i + 1, filteredOptions.length - 1),
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filteredOptions[highlightedIndex]) {
        e.preventDefault();
        commitSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        handleOpenChange(false);
      }
    } else if (e.key === "Tab") {
      if (open) handleOpenChange(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <div
          data-sselect-anchor={anchorId}
          className={cn(
            "relative flex h-10 w-full items-center rounded-lg border bg-white transition-colors",
            hasError ? "border-rose-500" : "border-slate-200",
            disabled ? "bg-slate-100 cursor-not-allowed" : "",
            "focus-within:ring-2 focus-within:ring-[#007bff]/20 focus-within:border-[#007bff]",
            className,
          )}
        >
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            disabled={disabled}
            value={displayValue}
            placeholder={placeholder}
            onChange={(e) => {
              setQuery(e.target.value);
              setEditing(true);
              if (!open) setOpen(true);
            }}
            onFocus={() => {
              if (disabled) return;
              // Preserve any in-progress typed text; only open the menu.
              if (!open) setOpen(true);
            }}
            onClick={(e) => {
              // Clicking inside an already-focused input must NOT toggle the
              // menu (no re-animation). Just position the caret normally.
              e.stopPropagation();
              if (disabled) return;
              if (!open) setOpen(true);
            }}
            onMouseDown={(e) => {
              // Allow native text-selection behavior; don't let Radix interpret
              // this as a click outside the popover.
              e.stopPropagation();
            }}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex-1 min-w-0 bg-transparent px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none disabled:cursor-not-allowed disabled:text-slate-400",
            )}
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onMouseDown={(e) => {
              // Prevent the input from losing focus AND prevent Radix's
              // outside-click handler from firing.
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenChange(!open);
            }}
            className={cn(
              "px-2 h-full flex items-center text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed",
            )}
            aria-label={open ? "Đóng danh sách" : "Mở danh sách"}
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
            />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        // Crucial: when the user clicks or text-selects INSIDE the anchor
        // (our input + chevron), Radix would normally dismiss the popover —
        // causing a close+reopen flicker. Filter out those events.
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (target?.closest(`[data-sselect-anchor="${anchorId}"]`)) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (target?.closest(`[data-sselect-anchor="${anchorId}"]`)) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (target?.closest(`[data-sselect-anchor="${anchorId}"]`)) {
            e.preventDefault();
          }
        }}
        className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[240px] shadow-lg border border-slate-200 bg-white rounded-lg overflow-hidden"
      >
        <ul
          ref={listRef}
          role="listbox"
          className="max-h-72 overflow-y-auto overscroll-contain py-1"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-4 text-center text-sm text-slate-500">
              {emptyMessage}
            </li>
          ) : (
            filteredOptions.map((opt, idx) => {
              const val = getOptionValue(opt);
              const label = getOptionLabel(opt);
              const sub = getOptionSubLabel?.(opt);
              const selected = value === val;
              const highlighted = idx === highlightedIndex;
              return (
                <li
                  key={val}
                  data-index={idx}
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => commitSelect(opt)}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer px-3 py-2 text-sm",
                    highlighted ? "bg-[#007bff]/10" : "",
                    selected ? "font-medium" : "",
                  )}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0 text-[#007bff]",
                      selected ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-slate-800">{label}</span>
                    {sub && (
                      <span className="truncate text-xs text-slate-500">{sub}</span>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
