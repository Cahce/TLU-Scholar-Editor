import { useEffect, useRef, useState } from "react";
import { cn } from "../ui/utils";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Registry of currently-open shells (in opening order). Only the topmost
 * dialog reacts to Escape and traps Tab, so stacked dialogs (e.g. a confirm
 * on top of a larger dialog) don't fight over keyboard events.
 */
const openShellStack: Array<{ id: number }> = [];
let nextShellId = 0;

/** Prefer an explicit [data-autofocus] target, then a form control, then anything focusable. */
function findInitialFocus(panel: HTMLElement): HTMLElement | null {
  return (
    panel.querySelector<HTMLElement>("[data-autofocus]") ??
    panel.querySelector<HTMLElement>(
      'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])',
    ) ??
    panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
  );
}

export type ModalSize = "sm" | "md" | "lg" | "xl";

const SIZE_MAX: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-4xl",
};

export interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  /**
   * Allow closing by clicking the backdrop or pressing Escape.
   * Set false while a blocking action (submitting/uploading) is in flight.
   */
  dismissable?: boolean;
  /** id of the element labelling the dialog (wired to aria-labelledby). */
  labelledBy?: string;
  /** Extra classes merged onto the panel. */
  className?: string;
  children: React.ReactNode;
}

/**
 * Shared animated modal shell for every admin dialog (form / confirm / import).
 *
 * Centralizing the overlay here keeps add/edit/delete dialogs visually and
 * behaviourally consistent across all admin sub-modules and adds smooth
 * enter/exit motion (the panel is kept mounted briefly on close so the exit
 * transition can play), Escape-to-close, backdrop-to-close, and body scroll
 * lock. Consumers only render the header/body/footer content.
 */
export function ModalShell({
  isOpen,
  onClose,
  size = "md",
  dismissable = true,
  labelledBy,
  className,
  children,
}: ModalShellProps) {
  // `mounted` keeps the panel in the DOM during the exit transition.
  const [mounted, setMounted] = useState(isOpen);
  // `shown` drives the enter/exit transition classes.
  const [shown, setShown] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  // Element that had focus before the modal opened — restored on close.
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  // Stable identity of this shell inside the open-shell stack.
  const shellIdRef = useRef<{ id: number } | null>(null);
  if (shellIdRef.current === null) shellIdRef.current = { id: nextShellId++ };

  const isTopmostShell = () =>
    openShellStack[openShellStack.length - 1] === shellIdRef.current;

  useEffect(() => {
    if (!isOpen) return;
    const entry = shellIdRef.current!;
    openShellStack.push(entry);
    return () => {
      const index = openShellStack.indexOf(entry);
      if (index >= 0) openShellStack.splice(index, 1);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const timer = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !dismissable) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTopmostShell()) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, dismissable, onClose]);

  // Initial focus on open + restore focus to the trigger on close.
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      const id = requestAnimationFrame(() => {
        const panel = panelRef.current;
        if (!panel) return;
        // Don't steal focus if a consumer already focused something inside.
        if (panel.contains(document.activeElement)) return;
        findInitialFocus(panel)?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      const previous = previousFocusRef.current;
      if (previous && document.contains(previous)) previous.focus();
    }
  }, [isOpen]);

  // Keep Tab / Shift+Tab cycling inside the panel while the modal is open.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !isTopmostShell()) return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      if (e.shiftKey) {
        if (!active || active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (!active || active === last || !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden
        onClick={dismissable ? onClose : undefined}
        className={cn(
          "absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200 ease-out",
          shown ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/5",
          "flex flex-col max-h-[90vh] overflow-hidden",
          "transition-all duration-200 ease-out motion-reduce:transition-none",
          shown
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-2 scale-[0.97]",
          SIZE_MAX[size],
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
