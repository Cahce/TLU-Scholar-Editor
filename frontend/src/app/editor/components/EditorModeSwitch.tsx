import { Code2, Eye } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import type { EditorMode } from "../types/visual";
import { cn } from "../../components/ui/utils";

interface Props {
  mode: EditorMode;
  disabled?: boolean;
  disabledReason?: string;
  onChange: (mode: EditorMode) => void;
}

interface ModeButtonProps {
  selected: boolean;
  disabled: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  ariaLabel: string;
  onClick: () => void;
}

function ModeButton({
  selected,
  disabled,
  icon: Icon,
  label,
  ariaLabel,
  onClick,
}: ModeButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-600 hover:text-slate-900",
        disabled && "opacity-40 cursor-not-allowed hover:text-slate-600",
      )}
    >
      <Icon className="size-3.5" />
      <span>{label}</span>
    </button>
  );
}

export function EditorModeSwitch({
  mode,
  disabled = false,
  disabledReason,
  onChange,
}: Props): JSX.Element {
  const group = (
    <div
      role="tablist"
      aria-label="Editor mode"
      className={cn(
        "inline-flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5",
        disabled && "opacity-60",
      )}
    >
      <ModeButton
        selected={mode === "code"}
        disabled={disabled}
        icon={Code2}
        label="Code"
        ariaLabel="Switch to Code mode"
        onClick={() => !disabled && mode !== "code" && onChange("code")}
      />
      <ModeButton
        selected={mode === "visual"}
        disabled={disabled}
        icon={Eye}
        label="Visual"
        ariaLabel="Switch to Visual mode"
        onClick={() => !disabled && mode !== "visual" && onChange("visual")}
      />
    </div>
  );

  if (disabled && disabledReason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{group}</span>
        </TooltipTrigger>
        <TooltipContent>{disabledReason}</TooltipContent>
      </Tooltip>
    );
  }

  return group;
}
