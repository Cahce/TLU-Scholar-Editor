import { useEffect } from "react";
import { useEditorStore } from "../state/editorStore";

/**
 * Bootstrap editor state when projectId changes
 * Handles unmount cancellation to prevent state updates on unmounted component
 */
export function useEditorBootstrap(
  projectId: string | null | undefined,
  readOnly = false,
): void {
  const bootstrap = useEditorStore((s) => s.bootstrap);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    // Wrap bootstrap to check cancellation
    const runBootstrap = async () => {
      try {
        await bootstrap(projectId, readOnly);
      } catch (error) {
        if (!cancelled) {
          console.error("Bootstrap error:", error);
        }
      }
    };

    void runBootstrap();

    return () => {
      cancelled = true;
    };
  }, [projectId, readOnly, bootstrap]);
}
