import { useEffect, useMemo, useState } from "react";
import { FileText, Hash, Sigma, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { useEditorStore } from "../state/editorStore";
import {
  countTypstStats,
  type TypstWordStats,
} from "../services/TypstWordCountService";

interface WordCountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Row {
  label: string;
  value: number | string;
}

function StatGroup({
  icon,
  title,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  rows: Row[];
}): JSX.Element {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-[#007bff]">
          {icon}
        </span>
        <h4 className="text-xs font-semibold text-slate-700">{title}</h4>
      </div>
      <dl className="space-y-1.5">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between text-sm"
          >
            <dt className="text-slate-500">{r.label}</dt>
            <dd className="font-medium tabular-nums text-slate-900">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function WordCountModal({
  open,
  onOpenChange,
}: WordCountModalProps): JSX.Element {
  const activePath = useEditorStore((s) => s.activePath);
  const drafts = useEditorStore((s) => s.drafts);
  const files = useEditorStore((s) => s.files);

  const source = useMemo(() => {
    if (!activePath) return "";
    return drafts[activePath]?.content ?? files[activePath]?.textContent ?? "";
  }, [activePath, drafts, files]);

  const [stats, setStats] = useState<TypstWordStats | null>(null);
  const [computing, setComputing] = useState(false);

  // Auto-compute on open + when source changes while open.
  useEffect(() => {
    if (!open) return;
    setComputing(true);
    // Defer to next microtask so the modal can paint the "Đang tính..." state.
    const timer = window.setTimeout(() => {
      setStats(countTypstStats(source));
      setComputing(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, source]);

  const recalc = (): void => {
    setComputing(true);
    setTimeout(() => {
      setStats(countTypstStats(source));
      setComputing(false);
    }, 0);
  };

  const isTypst = !!activePath && activePath.endsWith(".typ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Đếm từ</DialogTitle>
          <DialogDescription>
            {activePath ? (
              <>
                Thống kê cho tệp{" "}
                <span className="font-medium text-slate-700">{activePath}</span>
                . Là số liệu ước tính trên mã nguồn.
              </>
            ) : (
              "Chưa chọn tệp."
            )}
          </DialogDescription>
        </DialogHeader>

        {!isTypst ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Chỉ áp dụng cho tệp .typ.
          </p>
        ) : computing || !stats ? (
          <p className="py-6 text-center text-sm text-slate-500">Đang tính...</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatGroup
              icon={<FileText className="h-4 w-4" />}
              title="Văn bản"
              rows={[
                { label: "Tổng số từ", value: stats.totalWords.toLocaleString() },
                {
                  label: "Tổng số ký tự",
                  value: stats.totalCharacters.toLocaleString(),
                },
                {
                  label: "Ký tự (không khoảng trắng)",
                  value: stats.charactersNoSpaces.toLocaleString(),
                },
              ]}
            />
            <StatGroup
              icon={<Hash className="h-4 w-4" />}
              title="Tiêu đề & Chú thích"
              rows={[
                { label: "Số tiêu đề", value: stats.headerCount.toLocaleString() },
                {
                  label: "Từ trong tiêu đề",
                  value: stats.headerWords.toLocaleString(),
                },
                {
                  label: "Từ trong chú thích hình",
                  value: stats.captionWords.toLocaleString(),
                },
              ]}
            />
            <StatGroup
              icon={<Sigma className="h-4 w-4" />}
              title="Công thức toán"
              rows={[
                { label: "Biểu thức inline", value: stats.inlineMath.toLocaleString() },
                {
                  label: "Biểu thức display",
                  value: stats.displayMath.toLocaleString(),
                },
              ]}
            />
            <StatGroup
              icon={<ImageIcon className="h-4 w-4" />}
              title="Hình & Bảng"
              rows={[
                { label: "Số figure", value: stats.figureCount.toLocaleString() },
              ]}
            />
          </div>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={recalc} disabled={computing || !isTypst}>
            Tính lại
          </Button>
          <Button onClick={() => onOpenChange(false)}>Đóng</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
