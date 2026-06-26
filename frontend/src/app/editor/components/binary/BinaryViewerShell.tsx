import type { ReactNode } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useEditorStore } from "../../state/editorStore";
import { MetadataCard } from "./MetadataCard";

interface BinaryViewerShellProps {
  /** The preview body (iframe / image / icon). Fills the top panel. */
  children: ReactNode;
  format: string;
  /**
   * Pass `undefined` to omit the Resolution row entirely (PDF / font), or a
   * `string | null` to render it (`null` shows a "—" placeholder).
   */
  resolution?: string | null;
  sizeBytes: number | null;
  lastChangedAt: string | null;
  mimeType?: string | null;
  path: string;
}

/**
 * Shared layout for non-code binary viewers (PDF / image / SVG / font).
 *
 * Wraps the preview in the top panel and the file `MetadataCard` in a bottom
 * panel that is:
 *   - collapsible: hidden entirely when `binaryInfoVisible` is off (toggled
 *     from the editor toolbar) so the preview can use the full height;
 *   - resizable: a drag handle lets the user grow/shrink the info area
 *     (size persisted via `autoSaveId`);
 *   - scrollable: the card scrolls inside the panel instead of being clipped
 *     when the panel is short.
 *
 * The preview panel keeps a stable `id`/`order` so toggling the info panel
 * never remounts it (important for the PDF iframe — a remount would reload the
 * document and lose the scroll position).
 */
export function BinaryViewerShell({
  children,
  format,
  resolution,
  sizeBytes,
  lastChangedAt,
  mimeType,
  path,
}: BinaryViewerShellProps): JSX.Element {
  const infoVisible = useEditorStore((s) => s.binaryInfoVisible);

  return (
    <div className="h-full min-h-0 flex flex-col bg-slate-50">
      <PanelGroup
        direction="vertical"
        autoSaveId="tlu-binary-info"
        className="flex-1 min-h-0"
      >
        <Panel id="binary-preview" order={1} minSize={20} className="min-h-0">
          {children}
        </Panel>

        {infoVisible && (
          <>
            <PanelResizeHandle className="group relative h-1.5 shrink-0 cursor-row-resize border-t border-slate-200 bg-slate-100 transition-colors hover:bg-[#007bff]/20 active:bg-[#007bff]/40 flex items-center justify-center">
              <div className="h-1 w-10 rounded-full bg-slate-300 transition-colors group-hover:bg-[#007bff]/60" />
            </PanelResizeHandle>
            <Panel
              id="binary-info"
              order={2}
              defaultSize={30}
              minSize={12}
              maxSize={75}
              className="min-h-0"
            >
              <div className="h-full overflow-auto bg-white p-4">
                <MetadataCard
                  format={format}
                  resolution={resolution}
                  sizeBytes={sizeBytes}
                  lastChangedAt={lastChangedAt}
                  mimeType={mimeType}
                  path={path}
                />
              </div>
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
}
