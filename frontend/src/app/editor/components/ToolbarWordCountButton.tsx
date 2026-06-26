/**
 * ToolbarWordCountButton — opens the Word Count modal from the editor
 * toolbar. Mirrors `ToolbarFormatButton` in styling so the two appear as a
 * pair.
 *
 * Phase 1 originally surfaced word count through two triggers:
 *   - the Σ icon in the OutlinePanel header (only visible when the user
 *     switches to the Outline sidebar tab); and
 *   - the "Xem → Đếm từ" entry in the top menu bar.
 *
 * Both are still wired, but users discovering the feature for the first
 * time miss them. This button is the third, always-visible trigger —
 * mounted right next to the existing Wand2 format button so the editor's
 * "do something to this document" affordances cluster together.
 *
 * It uses the same custom event (`editor:openWordCount`) that the
 * OutlinePanel button dispatches, so there's a single sink in
 * `ProjectWorkspace.tsx` that opens the modal.
 */

import { Sigma } from "lucide-react";

export function ToolbarWordCountButton(): JSX.Element {
  const handleClick = (): void => {
    window.dispatchEvent(new CustomEvent("editor:openWordCount"));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="ml-1 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#007bff] focus:outline-none focus:ring-2 focus:ring-[#007bff]/30 transition-colors"
      title="Đếm từ (Σ)"
      aria-label="Mở thống kê đếm từ"
    >
      <Sigma className="size-4" />
    </button>
  );
}
