import { AlertCircle, AlertTriangle, Settings } from "lucide-react";
import { useState } from "react";
import { useEditorStore } from "../state/editorStore";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { ToolbarFormatButton } from "./ToolbarFormatButton";
import { ToolbarWordCountButton } from "./ToolbarWordCountButton";

/**
 * EditorToolbar - Editor formatting toolbar with diagnostic status badge and settings
 */
export function EditorToolbar(): JSX.Element {
  const diagnostics = useEditorStore((s) => s.diagnostics);
  const projectId = useEditorStore((s) => s.projectId);
  const settings = useEditorStore((s) => s.settings);
  const setMainFile = useEditorStore((s) => s.setMainFile);
  
  const [mainPathInput, setMainPathInput] = useState(settings?.mainPath ?? "");
  const [saving, setSaving] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  // Count errors and warnings
  const errorCount = diagnostics.filter((d) => d.severity === "error").length;
  const warningCount = diagnostics.filter((d) => d.severity === "warning").length;
  
  const showBadge = errorCount > 0 || warningCount > 0;
  
  const handleSaveMainPath = async (): Promise<void> => {
    if (!projectId || !mainPathInput.trim()) {
      toast.error("Tệp chính không được để trống");
      return;
    }

    setSaving(true);
    try {
      await setMainFile(mainPathInput.trim());
      toast.success("Đã cập nhật tệp chính");
      setPopoverOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể cập nhật thiết lập");
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="flex h-10 items-center gap-2 border-b border-slate-200 bg-white px-3">
      <div className="text-xs text-slate-500">Editor toolbar</div>
      
      {/* Settings popover */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className="ml-2 rounded p-1 hover:bg-slate-100"
            aria-label="Project settings"
          >
            <Settings className="size-4 text-slate-600" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 font-medium">Project Settings</h4>
              <p className="text-xs text-slate-500">
                Configure the main entry file for compilation
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mainPath">Main Path</Label>
              <Input
                id="mainPath"
                value={mainPathInput}
                onChange={(e) => setMainPathInput(e.target.value)}
                placeholder="main.typ"
                className="text-sm"
              />
              <p className="text-xs text-slate-500">
                The entry file used for preview and export
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMainPathInput(settings?.mainPath ?? "");
                  setPopoverOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSaveMainPath()}
                disabled={saving || mainPathInput === settings?.mainPath}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <ToolbarFormatButton />
      <ToolbarWordCountButton />

      {showBadge && (
        <div 
          className="ml-auto flex items-center gap-2 text-xs"
          aria-live="polite"
          aria-atomic="true"
        >
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <AlertCircle className="size-3.5" />
              <span>{errorCount} {errorCount === 1 ? "error" : "errors"}</span>
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="size-3.5" />
              <span>{warningCount} {warningCount === 1 ? "warning" : "warnings"}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
