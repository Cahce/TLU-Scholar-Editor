import type { ReactNode } from "react";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "../../../components/ui/utils";
import { CodeBlock } from "./CodeBlock";

/** Khung "Kết quả" mô phỏng bản render Typst (giấy trắng, phông chữ serif). */
export function ResultPanel({
  children,
  label = "Kết quả",
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="px-3 py-1.5 border-b border-slate-200 bg-slate-100/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div
        className={cn(
          "p-5 font-serif text-[15px] leading-relaxed text-slate-900 [&_p]:my-0",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Ảnh preview do Typst biên dịch thật (SVG), sinh bởi
 * `backend/scripts/gen-help-previews.mjs` → `public/help-previews/<id>.svg`.
 */
export function PreviewImage({ id, alt }: { id: string; alt: string }) {
  return (
    <img
      src={`/help-previews/${id}.svg`}
      alt={alt}
      loading="lazy"
      className="block max-w-full h-auto mx-auto"
    />
  );
}

/** Ví dụ: mã Typst bên trái + khung "Kết quả" bên phải (xếp dọc trên màn nhỏ). */
export function Example({
  code,
  language,
  caption,
  children,
}: {
  code: string;
  language?: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-3 items-start">
      <CodeBlock code={code} language={language} caption={caption} />
      <ResultPanel>{children}</ResultPanel>
    </div>
  );
}

/* ---------- Khối dựng hình cho phần "Kết quả" ---------- */

/** Phân số hiển thị dọc. */
export function Frac({ n, d }: { n: ReactNode; d: ReactNode }) {
  return (
    <span className="inline-flex flex-col items-center align-middle mx-0.5 text-[0.92em] leading-none">
      <span className="px-1 pb-0.5">{n}</span>
      <span className="px-1 pt-0.5 border-t border-slate-800 w-full text-center">{d}</span>
    </span>
  );
}

/** Căn bậc hai với gạch trên. */
export function Sqrt({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-start align-middle">
      <span className="text-[1.15em] leading-none">√</span>
      <span className="border-t border-slate-800 px-0.5 leading-snug">{children}</span>
    </span>
  );
}

/** Ma trận / vector trong ngoặc. */
export function Matrix({ rows }: { rows: ReactNode[][] }) {
  const cols = rows[0]?.length ?? 1;
  return (
    <span className="inline-flex items-center align-middle mx-0.5">
      <span className="text-[1.8em] leading-none text-slate-700">(</span>
      <span
        className="inline-grid gap-x-3 gap-y-0.5 px-1 text-center"
        style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}
      >
        {rows.flatMap((row, i) => row.map((cell, j) => <span key={`${i}-${j}`}>{cell}</span>))}
      </span>
      <span className="text-[1.8em] leading-none text-slate-700">)</span>
    </span>
  );
}

/** Ô giả lập ảnh trong bản render. */
export function ImageBox({
  label = "Hình minh hoạ",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded bg-slate-100 border border-dashed border-slate-300 text-slate-400 py-7",
        className,
      )}
    >
      <ImageIcon className="w-6 h-6" />
      <span className="text-xs font-sans not-italic">{label}</span>
    </div>
  );
}

/** Chú thích hình/bảng căn giữa. */
export function Caption({ children }: { children: ReactNode }) {
  return <p className="text-center text-[13px] text-slate-600 mt-2">{children}</p>;
}
