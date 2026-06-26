import type { EditorCommand, EditorCommandCtx, MenuEntry } from "./types";

/**
 * Filter a menu's entries by each command's `isVisible(ctx)`, then collapse
 * separators so hiding items (e.g. all export actions in read-only mode) never
 * leaves a leading / trailing / doubled divider.
 */
export function filterEntries(
  entries: MenuEntry[],
  commands: Record<string, EditorCommand>,
  ctx: EditorCommandCtx,
): MenuEntry[] {
  const visible = entries.filter((e) => {
    if ("sep" in e || "submenu" in e) return true;
    const cmd = commands[e.id];
    return cmd ? cmd.isVisible?.(ctx) ?? true : false;
  });

  const out: MenuEntry[] = [];
  for (const e of visible) {
    if ("sep" in e) {
      if (out.length === 0) continue; // drop leading separator
      if ("sep" in out[out.length - 1]) continue; // drop doubled separator
    }
    out.push(e);
  }
  while (out.length > 0 && "sep" in out[out.length - 1]) out.pop(); // trailing
  return out;
}
