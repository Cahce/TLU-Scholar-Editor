import { useEffect, useState } from "react";
import {
  Crosshair,
  Eye,
  Keyboard,
  ListTree,
  LocateFixed,
  Minus,
  MoveDownRight,
  Plus,
  RotateCcw,
  Sigma,
  Type,
  Wand2,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useEditorStore } from "../state/editorStore";
import {
  getFollowTyping,
  getFormatOnSave,
  getMathliveEnabled,
  getOutlineAutoHighlight,
  getSvgMode,
  getSyncForward,
  getSyncReverse,
  getVimMode,
  setFollowTypingPref,
  setFormatOnSavePref,
  setMathliveEnabledPref,
  setOutlineAutoHighlight,
  setSvgMode,
  setSyncForwardPref,
  setSyncReversePref,
  setVimModePref,
  subscribeSettings,
  type SvgMode,
} from "../state/previewSettings";

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 24;
const DEFAULT_FONT_SIZE = 16;

function clampFontSize(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_FONT_SIZE;
  }

  return Math.min(Math.max(Math.round(value), MIN_FONT_SIZE), MAX_FONT_SIZE);
}

export function EditorSettingsPanel(): JSX.Element {
  const editorFontSize = useEditorStore((s) => s.editorFontSize);
  const setEditorFontSize = useEditorStore((s) => s.setEditorFontSize);

  const [outlineAutoHighlight, setLocalOutlineAutoHighlight] = useState(() =>
    getOutlineAutoHighlight(),
  );
  const [svgMode, setLocalSvgMode] = useState<SvgMode>(() => getSvgMode());
  const [vimMode, setLocalVimMode] = useState<boolean>(() => getVimMode());
  const [formatOnSave, setLocalFormatOnSave] = useState<boolean>(() => getFormatOnSave());
  const [mathliveEnabled, setLocalMathliveEnabled] = useState<boolean>(() => getMathliveEnabled());
  const [syncForward, setLocalSyncForward] = useState<boolean>(() => getSyncForward());
  const [syncReverse, setLocalSyncReverse] = useState<boolean>(() => getSyncReverse());
  const [followTyping, setLocalFollowTyping] = useState<boolean>(() => getFollowTyping());
  useEffect(() => {
    // Keep this panel in sync when the setting is toggled elsewhere (e.g.
    // future keyboard shortcut or a second tab).
    return subscribeSettings(() => {
      setLocalOutlineAutoHighlight(getOutlineAutoHighlight());
      setLocalSvgMode(getSvgMode());
      setLocalVimMode(getVimMode());
      setLocalFormatOnSave(getFormatOnSave());
      setLocalMathliveEnabled(getMathliveEnabled());
      setLocalSyncForward(getSyncForward());
      setLocalSyncReverse(getSyncReverse());
      setLocalFollowTyping(getFollowTyping());
    });
  }, []);

  const updateFontSize = (value: number): void => {
    setEditorFontSize(clampFontSize(value));
  };

  const toggleOutlineAutoHighlight = (): void => {
    const next = !outlineAutoHighlight;
    setOutlineAutoHighlight(next);
    setLocalOutlineAutoHighlight(next);
  };

  const toggleVimMode = (): void => {
    const next = !vimMode;
    setVimModePref(next);
    setLocalVimMode(next);
  };

  const toggleFormatOnSave = (): void => {
    const next = !formatOnSave;
    setFormatOnSavePref(next);
    setLocalFormatOnSave(next);
  };

  const toggleMathlive = (): void => {
    const next = !mathliveEnabled;
    setMathliveEnabledPref(next);
    setLocalMathliveEnabled(next);
  };

  const toggleSyncForward = (): void => {
    const next = !syncForward;
    setSyncForwardPref(next);
    setLocalSyncForward(next);
  };

  const toggleFollowTyping = (): void => {
    const next = !followTyping;
    setFollowTypingPref(next);
    setLocalFollowTyping(next);
  };

  const toggleSyncReverse = (): void => {
    const next = !syncReverse;
    setSyncReversePref(next);
    setLocalSyncReverse(next);
  };

  const updateSvgMode = (mode: SvgMode): void => {
    setSvgMode(mode);
    setLocalSvgMode(mode);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-3">
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Cài đặt trình soạn thảo</h3>
          <p className="mt-1 text-xs text-slate-500">
            Tùy chỉnh trải nghiệm soạn thảo trong dự án hiện tại.
          </p>
        </div>

        <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-[#007bff]">
              <Type className="h-4 w-4" />
            </span>
            <div>
              <Label
                htmlFor="editor-font-size"
                className="text-xs font-semibold text-slate-700"
              >
                Cỡ chữ trình soạn thảo
              </Label>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Áp dụng ngay cho vùng viết mã.
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => updateFontSize(editorFontSize - 1)}
              disabled={editorFontSize <= MIN_FONT_SIZE}
              title="Giảm cỡ chữ"
            >
              <Minus className="h-4 w-4" />
            </Button>

            <div className="relative flex-1">
              <Input
                id="editor-font-size"
                type="number"
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                value={editorFontSize}
                onChange={(event) => updateFontSize(Number(event.target.value))}
                className="h-8 pr-8 text-center text-sm"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                px
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => updateFontSize(editorFontSize + 1)}
              disabled={editorFontSize >= MAX_FONT_SIZE}
              title="Tăng cỡ chữ"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <input
            type="range"
            min={MIN_FONT_SIZE}
            max={MAX_FONT_SIZE}
            value={editorFontSize}
            onChange={(event) => updateFontSize(Number(event.target.value))}
            className="mt-3 h-1.5 w-full cursor-pointer accent-[#007bff]"
            aria-label="Điều chỉnh cỡ chữ trình soạn thảo"
          />

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>{MIN_FONT_SIZE}px</span>
            <span>{MAX_FONT_SIZE}px</span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-3 h-7 px-2 text-xs text-slate-600"
            onClick={() => updateFontSize(DEFAULT_FONT_SIZE)}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Đặt lại mặc định
          </Button>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-[#007bff]">
              <ListTree className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <Label
                htmlFor="outline-autohighlight"
                className="text-xs font-semibold text-slate-700"
              >
                Tự đánh dấu mục đang xem
              </Label>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Outline tự highlight section gần con trỏ / viewport hiện tại.
              </p>
            </div>
            <button
              id="outline-autohighlight"
              type="button"
              role="switch"
              aria-checked={outlineAutoHighlight}
              onClick={toggleOutlineAutoHighlight}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/30 ${
                outlineAutoHighlight ? "bg-[#007bff]" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  outlineAutoHighlight ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-[#007bff]">
              <Keyboard className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <Label
                htmlFor="vim-mode"
                className="text-xs font-semibold text-slate-700"
              >
                Vim keybindings (nâng cao)
              </Label>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Kích hoạt chế độ modal của Vim (Normal / Insert / Visual). Lưu ý:
                khi bật, <code>Ctrl+V</code> sẽ là Visual Block thay vì paste —
                dùng <code>p</code> ở Normal mode. Mặc định tắt.
              </p>
            </div>
            <button
              id="vim-mode"
              type="button"
              role="switch"
              aria-checked={vimMode}
              onClick={toggleVimMode}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/30 ${
                vimMode ? "bg-[#007bff]" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  vimMode ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-[#007bff]">
              <Wand2 className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <Label
                htmlFor="format-on-save"
                className="text-xs font-semibold text-slate-700"
              >
                Tự định dạng khi lưu
              </Label>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Chạy typstyle trước khi lưu các tệp .typ. Có thể format thủ công
                qua nút trên thanh công cụ hoặc Shift+Alt+F.
              </p>
            </div>
            <button
              id="format-on-save"
              type="button"
              role="switch"
              aria-checked={formatOnSave}
              onClick={toggleFormatOnSave}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/30 ${
                formatOnSave ? "bg-[#007bff]" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  formatOnSave ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-[#007bff]">
              <Sigma className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <Label
                htmlFor="mathlive-enabled"
                className="text-xs font-semibold text-slate-700"
              >
                Xem trước công thức toán
              </Label>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Khi cursor vào vùng <code>$...$</code>, hiện bản xem trước
                được biên dịch trực tiếp bằng Typst (giống Overleaf).
              </p>
            </div>
            <button
              id="mathlive-enabled"
              type="button"
              role="switch"
              aria-checked={mathliveEnabled}
              onClick={toggleMathlive}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/30 ${
                mathliveEnabled ? "bg-[#007bff]" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  mathliveEnabled ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </section>

        {/* Phase 4 — SyncTeX-equivalent for Typst (heading-level granularity).
            See TypstSourceMapService.ts for the rationale on coarse mapping. */}
        <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-[#007bff]">
              <MoveDownRight className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <Label htmlFor="sync-forward" className="text-xs font-semibold text-slate-700">
                Đồng bộ editor → preview
              </Label>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Khi cursor đổi mục, preview làm nổi vùng tương ứng (theo
                tiêu đề gần nhất).
              </p>
            </div>
            <button
              id="sync-forward"
              type="button"
              role="switch"
              aria-checked={syncForward}
              onClick={toggleSyncForward}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/30 ${
                syncForward ? "bg-[#007bff]" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  syncForward ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-[#007bff]">
              <Crosshair className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <Label htmlFor="sync-reverse" className="text-xs font-semibold text-slate-700">
                Đồng bộ preview → editor
              </Label>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Click trên preview để nhảy editor đến tiêu đề gần nhất phía
                trên vị trí đó.
              </p>
            </div>
            <button
              id="sync-reverse"
              type="button"
              role="switch"
              aria-checked={syncReverse}
              onClick={toggleSyncReverse}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/30 ${
                syncReverse ? "bg-[#007bff]" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  syncReverse ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </section>

        {/* Follow-typing preview scroll (spec: typing-latency-and-follow-preview
            US-3) — auto-scrolls the preview to the edited region after typing. */}
        <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-[#007bff]">
              <LocateFixed className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <Label htmlFor="follow-typing" className="text-xs font-semibold text-slate-700">
                Preview đi theo vị trí gõ
              </Label>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Tự cuộn preview tới vùng đang chỉnh sửa sau mỗi lần gõ. Cuộn
                tay sẽ tạm dừng tới lần gõ kế tiếp.
              </p>
            </div>
            <button
              id="follow-typing"
              type="button"
              role="switch"
              aria-checked={followTyping}
              onClick={toggleFollowTyping}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/30 ${
                followTyping ? "bg-[#007bff]" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  followTyping ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-[#007bff]">
              <Eye className="h-4 w-4" />
            </span>
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Bản xem trước (SVG)
              </Label>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Cách dựng bản xem trước (đây là bản xem trước duy nhất). Mặc
                định "Tăng tốc" để gõ nhẹ tài nguyên.
              </p>
            </div>
          </div>

          <div
            role="radiogroup"
            aria-label="Chế độ preview SVG"
            className="mt-3 space-y-1.5"
          >
            {([
              { value: "off", label: "Tắt", desc: "Tắt hẳn bản xem trước (gõ nhẹ nhất; bấm Xuất PDF để xem kết quả)." },
              { value: "full", label: "Đầy đủ", desc: "Dựng lại toàn bộ mỗi khi gõ (nặng hơn; chỉ dùng để đối chứng)." },
              { value: "incremental", label: "Tăng tốc (mặc định)", desc: "Dựng tăng dần: tái dụng phiên giữa các lần gõ, chỉ vá phần trang thay đổi. Lỗi bất kỳ tự rơi về chế độ đầy đủ." },
            ] satisfies { value: SvgMode; label: string; desc: string }[]).map((opt) => {
              const selected = svgMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => updateSvgMode(opt.value)}
                  className={`flex w-full items-start gap-2 rounded-md border px-2.5 py-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/30 ${
                    selected
                      ? "border-[#007bff] bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${
                      selected ? "border-[#007bff]" : "border-slate-300"
                    }`}
                    aria-hidden="true"
                  >
                    {selected ? (
                      <span className="size-2 rounded-full bg-[#007bff]" />
                    ) : null}
                  </span>
                  <span>
                    <span
                      className={`block text-xs font-medium ${
                        selected ? "text-[#007bff]" : "text-slate-700"
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      {opt.desc}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
