import type { LucideIcon } from "lucide-react";

interface FormSectionProps {
  title: string;
  /** Optional leading outline icon (e.g. Link2 for account-link sections). */
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard section block for multi-section admin forms: uppercase tracked
 * title over a divider. One shared style for Accounts / Teachers / Students /
 * Templates instead of per-page ad-hoc headers.
 */
export function FormSection({
  title,
  icon: Icon,
  children,
  className,
}: FormSectionProps) {
  return (
    <section className={className}>
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-4">
        {Icon && <Icon className="w-4 h-4 text-slate-600" />}
        <h3 className="text-sm font-bold text-slate-800 tracking-wider uppercase">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}
