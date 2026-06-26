import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../ui/utils";

/**
 * Admin form controls with one shared visual token set, matching
 * SearchableSelect: h-10, rounded-lg, slate border, brand-blue focus ring.
 * `invalid` switches the border/ring to the rose error palette and sets
 * `aria-invalid`, so callers never hand-roll error classes.
 *
 * Kept admin-scoped (instead of restyling `ui/input.tsx`) because the ui
 * wrapper is used across the whole app — including the editor — with its own
 * h-9 / semantic-token styling.
 */

const CONTROL_BASE =
  "w-full rounded-lg border bg-white px-3 text-sm text-slate-700 " +
  "placeholder:text-slate-400 outline-none transition-colors " +
  "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

function controlClass(invalid?: boolean, className?: string): string {
  return cn(
    CONTROL_BASE,
    invalid
      ? "border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
      : "border-slate-200 focus:border-[#007bff] focus:ring-2 focus:ring-[#007bff]/20",
    className,
  );
}

interface InvalidProp {
  /** Marks the control as having a validation error (border + aria-invalid). */
  invalid?: boolean;
}

export const TextInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & InvalidProp
>(function TextInput({ invalid, className, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={controlClass(invalid, cn("h-10", className))}
      {...props}
    />
  );
});

export const DateInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type"> & InvalidProp
>(function DateInput({ invalid, className, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="date"
      aria-invalid={invalid || undefined}
      className={controlClass(invalid, cn("h-10", className))}
      {...props}
    />
  );
});

export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select"> & InvalidProp
>(function NativeSelect({ invalid, className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={controlClass(
          invalid,
          cn("h-10 appearance-none pr-8 cursor-pointer", className),
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
});

export const TextArea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea"> & InvalidProp
>(function TextArea({ invalid, className, rows = 3, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={controlClass(invalid, cn("py-2 resize-y", className))}
      {...props}
    />
  );
});
