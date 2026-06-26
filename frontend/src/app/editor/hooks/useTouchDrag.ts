import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useTouchDrag — long-press touch drag support for file tree rows.
 *
 * HTML5 native DnD (mouse) doesn't fire touch events; mobile users would be
 * locked out of move-by-drag. This hook is a parallel code path: rows attach
 * `onTouchStart` and the hook orchestrates the rest through window-level
 * listeners (touchmove with `{passive: false}` so we can preventDefault to
 * suppress scroll once a drag is active).
 *
 * Trigger: long-press of ~350 ms with movement under 8 px. Anything else is
 * treated as a tap or scroll.
 *
 * Hit-test: each row in the tree has a `data-path` attribute (set on the row
 * div in FileTreePanel). On every touchmove we read the topmost element under
 * the touch via `document.elementFromPoint`, walk up to the nearest
 * `data-path` ancestor, and emit that path. The parent component decides
 * whether the path is a valid drop target (file rows are not, folders are).
 *
 * Auto-scroll: when the finger is within 50 px of the container's top or
 * bottom edge, we run a rAF scroll loop until the finger moves away. Keeps
 * long trees navigable without lifting and re-pressing.
 *
 * Mouse path is untouched — `draggable={true}` + `onDragStart/Drop` still
 * works exactly like Phase 1.
 */

const LONG_PRESS_MS = 350;
const MOVE_TOLERANCE_PX = 8;
const AUTOSCROLL_EDGE_PX = 50;
const AUTOSCROLL_SPEED_PX = 6;

export interface TouchDragOptions {
  /**
   * The scroll container of the file tree — needed for auto-scroll near
   * top/bottom edges. Pass the same ref you use for `overflow-y-auto`.
   */
  scrollContainerRef: React.RefObject<HTMLElement | null>;

  /** Called when long-press fires and the drag actually begins. */
  onDragStart: (sourcePath: string) => void;

  /** Called on every touchmove with the current hovered drop target path. */
  onDragOver: (targetPath: string | null) => void;

  /**
   * Called when the user lifts their finger over a valid target. The hook
   * cannot tell what's "valid" (file vs folder etc.) — the parent passes
   * `null` from `onDragOver` for invalid targets so we know to skip the
   * drop on release.
   */
  onDrop: (sourcePath: string, targetPath: string) => void;

  /** Called whenever the drag is cancelled or completed — clear UI state. */
  onDragEnd: () => void;
}

export interface TouchDragHandle {
  /** Spread on each row div: `<div {...handle.rowProps(path)}>`. */
  rowProps: (path: string) => {
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  };
  /** True while a touch-drag is active (use to render a ghost preview). */
  isDragging: boolean;
  /** Latest pointer position — useful for positioning a fixed-position ghost. */
  pointer: { x: number; y: number } | null;
  /** Source path of the active drag (null when idle). */
  sourcePath: string | null;
}

export function useTouchDrag(options: TouchDragOptions): TouchDragHandle {
  const { scrollContainerRef, onDragStart, onDragOver, onDrop, onDragEnd } = options;

  // Hold callbacks in a ref so the window-level listeners attached on
  // touchstart don't get stale closures when the parent re-renders.
  const callbacksRef = useRef({ onDragStart, onDragOver, onDrop, onDragEnd });
  useEffect(() => {
    callbacksRef.current = { onDragStart, onDragOver, onDrop, onDragEnd };
  }, [onDragStart, onDragOver, onDrop, onDragEnd]);

  const [isDragging, setIsDragging] = useState(false);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const sourcePathRef = useRef<string | null>(null);
  const [sourcePathState, setSourcePathState] = useState<string | null>(null);

  // Long-press machinery — separate from the React state so we can compute
  // synchronously inside touch handlers without race conditions.
  const longPressTimerRef = useRef<number | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTargetRef = useRef<string | null>(null);
  const autoscrollRafRef = useRef<number | null>(null);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const stopAutoscroll = useCallback(() => {
    if (autoscrollRafRef.current !== null) {
      cancelAnimationFrame(autoscrollRafRef.current);
      autoscrollRafRef.current = null;
    }
  }, []);

  const endDrag = useCallback(() => {
    clearLongPressTimer();
    stopAutoscroll();
    sourcePathRef.current = null;
    startPosRef.current = null;
    lastTargetRef.current = null;
    setIsDragging(false);
    setPointer(null);
    setSourcePathState(null);
    callbacksRef.current.onDragEnd();
  }, [clearLongPressTimer, stopAutoscroll]);

  // Resolve `data-path` ancestor from a touch point.
  const resolveTargetUnderTouch = useCallback((x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!el) return null;
    const target = el.closest("[data-path]");
    return target ? (target.getAttribute("data-path") ?? null) : null;
  }, []);

  // Auto-scroll loop — runs while finger is near container edges.
  const runAutoscroll = useCallback(
    (direction: "up" | "down") => {
      const container = scrollContainerRef.current;
      if (!container) return;
      stopAutoscroll();
      const step = () => {
        container.scrollTop += direction === "down" ? AUTOSCROLL_SPEED_PX : -AUTOSCROLL_SPEED_PX;
        autoscrollRafRef.current = requestAnimationFrame(step);
      };
      autoscrollRafRef.current = requestAnimationFrame(step);
    },
    [scrollContainerRef, stopAutoscroll],
  );

  // Window-level touchmove — attached when touchstart fires, removed on end.
  // Important: must NOT be passive, otherwise we can't preventDefault to
  // suppress page scroll once the drag is active.
  useEffect(() => {
    if (!isDragging && longPressTimerRef.current === null) return;

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const { clientX: x, clientY: y } = touch;
      const start = startPosRef.current;

      // Pre-trigger: if movement exceeds tolerance before long-press fires,
      // cancel the timer and treat as a scroll.
      if (start && !isDragging) {
        const dx = x - start.x;
        const dy = y - start.y;
        if (Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) {
          clearLongPressTimer();
        }
        return;
      }

      if (!isDragging) return;

      // Active drag — preventDefault to suppress scroll, update visuals.
      e.preventDefault();
      setPointer({ x, y });

      const target = resolveTargetUnderTouch(x, y);
      // Don't allow self-drop.
      const validTarget =
        target && target !== sourcePathRef.current ? target : null;
      if (validTarget !== lastTargetRef.current) {
        lastTargetRef.current = validTarget;
        callbacksRef.current.onDragOver(validTarget);
      }

      // Edge auto-scroll.
      const container = scrollContainerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        if (y < rect.top + AUTOSCROLL_EDGE_PX) {
          runAutoscroll("up");
        } else if (y > rect.bottom - AUTOSCROLL_EDGE_PX) {
          runAutoscroll("down");
        } else {
          stopAutoscroll();
        }
      }
    };

    const onTouchEnd = () => {
      const src = sourcePathRef.current;
      const target = lastTargetRef.current;
      if (isDragging && src && target) {
        callbacksRef.current.onDrop(src, target);
      }
      endDrag();
    };

    const onTouchCancel = () => {
      endDrag();
    };

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchCancel);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [
    isDragging,
    clearLongPressTimer,
    endDrag,
    resolveTargetUnderTouch,
    runAutoscroll,
    scrollContainerRef,
    stopAutoscroll,
  ]);

  const rowProps = useCallback(
    (path: string) => ({
      onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => {
        const touch = e.touches[0];
        if (!touch) return;
        startPosRef.current = { x: touch.clientX, y: touch.clientY };
        sourcePathRef.current = path;
        clearLongPressTimer();
        longPressTimerRef.current = window.setTimeout(() => {
          longPressTimerRef.current = null;
          // Haptic cue on supporting devices (Android). iOS Safari ignores.
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            try {
              navigator.vibrate(50);
            } catch {
              /* no-op */
            }
          }
          setIsDragging(true);
          setSourcePathState(path);
          setPointer(startPosRef.current);
          callbacksRef.current.onDragStart(path);
        }, LONG_PRESS_MS);
      },
    }),
    [clearLongPressTimer],
  );

  return {
    rowProps,
    isDragging,
    pointer,
    sourcePath: sourcePathState,
  };
}
