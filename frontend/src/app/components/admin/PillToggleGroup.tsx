import type { LucideIcon } from "lucide-react";
import { cn } from "../ui/utils";

export interface PillOption<V extends string> {
  value: V;
  label: string;
  /** Optional trailing icon (e.g. UserPlus on "create" pills). */
  icon?: LucideIcon;
}

interface PillToggleGroupProps<V extends string> {
  options: Array<PillOption<V>>;
  value: V;
  onChange: (value: V) => void;
  /** Accessible name for the group (e.g. "Chế độ liên kết tài khoản"). */
  ariaLabel?: string;
  className?: string;
}

/**
 * Shared pill-style mode selector for admin forms (account link modes on
 * Teachers / Students / Accounts). Mode-change side effects (clearing errors,
 * resetting dependent fields) belong in the caller's `onChange`.
 */
export function PillToggleGroup<V extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: PillToggleGroupProps<V>) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const active = value === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors flex items-center gap-1.5",
              active
                ? "bg-[#007bff] text-white border-[#007bff]"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300",
            )}
          >
            {option.label}
            {Icon && <Icon className="w-3 h-3" />}
          </button>
        );
      })}
    </div>
  );
}
