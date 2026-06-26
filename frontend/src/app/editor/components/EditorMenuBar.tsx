import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { HELP_TOPICS } from "../../features/help/helpContent";
import { filterEntries } from "../commands/menuUtils";
import type { MenuEntry } from "../commands/types";
import type { UseEditorCommandsResult } from "../commands/useEditorCommands";

interface EditorMenuBarProps {
  menu: UseEditorCommandsResult;
}

const MENUS: { key: keyof UseEditorCommandsResult["layout"]; label: string }[] = [
  { key: "file", label: "Tệp" },
  { key: "edit", label: "Chỉnh sửa" },
  { key: "view", label: "Xem" },
  { key: "help", label: "Trợ giúp" },
];

const triggerCls =
  "px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007bff]/30";

function openTopic(slug: string): void {
  window.open(`/huong-dan/${slug}`, "_blank", "noopener,noreferrer");
}

/**
 * The Tệp / Chỉnh sửa / Xem / Trợ giúp menu bar in the workspace header.
 * Renders entirely from the command registry (single source of truth). Hidden
 * below `md` — the ⋮ overflow menu carries the essentials on small screens.
 */
export function EditorMenuBar({ menu }: EditorMenuBarProps): JSX.Element {
  const { commands, layout, ctx, run } = menu;

  const renderEntry = (entry: MenuEntry, index: number): JSX.Element | null => {
    if ("sep" in entry) {
      return <DropdownMenuSeparator key={`sep-${index}`} />;
    }
    if ("submenu" in entry) {
      // Only the Help topics submenu exists today.
      return (
        <DropdownMenuSub key="help-topics">
          <DropdownMenuSubTrigger>Chủ đề trợ giúp</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-[16rem]">
            {HELP_TOPICS.map((topic) => (
              <DropdownMenuItem
                key={topic.slug}
                onSelect={() => openTopic(topic.slug)}
              >
                <topic.icon className="size-4" />
                {topic.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    }

    const cmd = commands[entry.id];
    if (!cmd) return null;
    const Icon = cmd.icon;
    const enabled = cmd.isEnabled?.(ctx) ?? true;
    return (
      <DropdownMenuItem
        key={cmd.id}
        disabled={!enabled}
        onSelect={() => run(cmd.id)}
      >
        {Icon && <Icon className="size-4" />}
        <span>{cmd.label}</span>
        {cmd.shortcut && (
          <DropdownMenuShortcut>{cmd.shortcut}</DropdownMenuShortcut>
        )}
      </DropdownMenuItem>
    );
  };

  return (
    <div className="hidden md:flex items-center gap-1 px-2">
      {MENUS.map(({ key, label }) => {
        const entries = filterEntries(layout[key], commands, ctx);
        if (entries.length === 0) return null;
        return (
          <DropdownMenu key={key}>
            <DropdownMenuTrigger asChild>
              <button className={triggerCls}>{label}</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[13rem]">
              {entries.map(renderEntry)}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </div>
  );
}
