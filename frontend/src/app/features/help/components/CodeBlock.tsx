import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

interface CodeBlockProps {
  code: string;
  /** Nhãn ngôn ngữ hiển thị ở góc trên, mặc định "Typst". */
  language?: string;
  /** Chú thích mô tả kết quả, hiển thị dưới khối mã. */
  caption?: string;
}

/** Khối mã Typst có nút sao chép (dùng chung cho mọi trang tài liệu). */
export function CodeBlock({ code, language = "Typst", caption }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Đã sao chép mã Typst");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Trình duyệt không cho phép sao chép");
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-100/70">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {language}
        </span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-white hover:text-[#007bff] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007bff]"
          aria-label="Sao chép mã"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? "Đã chép" : "Sao chép"}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-[13px] leading-relaxed">
        <code className="font-mono text-slate-800 whitespace-pre">{code}</code>
      </pre>
      {caption && (
        <div className="px-3.5 py-2 border-t border-slate-200 bg-white text-xs text-slate-500">
          {caption}
        </div>
      )}
    </div>
  );
}
