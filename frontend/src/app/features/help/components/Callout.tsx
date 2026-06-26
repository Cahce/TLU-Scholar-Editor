import type { ReactNode } from "react";
import { AlertTriangle, Check, Info, Lightbulb } from "lucide-react";
import { cn } from "../../../components/ui/utils";

interface CalloutProps {
  tone?: "info" | "warning" | "success" | "tip";
  title?: string;
  children: ReactNode;
}

/** Hộp ghi chú (info / warning / success / tip) dùng chung cho trang tài liệu. */
export function Callout({ tone = "info", title, children }: CalloutProps) {
  const toneClass = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    tip: "border-blue-200 bg-blue-50 text-blue-900",
  }[tone];

  const Icon =
    tone === "warning"
      ? AlertTriangle
      : tone === "success"
        ? Check
        : tone === "tip"
          ? Lightbulb
          : Info;

  return (
    <div className={cn("rounded-lg border px-4 py-3 flex items-start gap-2.5 text-sm", toneClass)}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="space-y-1 min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className="leading-relaxed [&_code]:rounded [&_code]:bg-white/70 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px]">
          {children}
        </div>
      </div>
    </div>
  );
}
