import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { getFn } from "../reference";
import { ParamTable } from "./ParamTable";

/**
 * Xem nhanh tham số của một hàm Typst (chữ ký + bảng tham số + link trang đầy đủ).
 * Trả null nếu hàm chưa có trong registry → degrade an toàn.
 */
export function ParamPreview({ category, fn }: { category: string; fn: string }) {
  const found = getFn(category, fn);
  if (!found) return null;
  const refFn = found.fn;
  return (
    <div className="space-y-2.5">
      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 overflow-x-auto">
        <code className="font-mono text-[12px] text-slate-700 whitespace-pre">{refFn.signature}</code>
      </div>
      <ParamTable params={refFn.params} />
      <Link
        to={`/huong-dan/tra-cuu/${category}/${fn}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-[#007bff] hover:underline"
      >
        Mở trang đầy đủ <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

/**
 * Dải chip liên kết tới trang tham số của các hàm dùng trong một ví dụ.
 * Chỉ hiện chip cho hàm đã có trong registry (degrade an toàn).
 */
export function FnChips({ refs }: { refs: { category: string; fn: string }[] }) {
  const valid = refs.map((r) => getFn(r.category, r.fn)).filter((x) => x !== undefined);
  if (valid.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-slate-400">Tham số:</span>
      {valid.map((hit) => (
        <Link
          key={`${hit!.category.slug}/${hit!.fn.slug}`}
          to={`/huong-dan/tra-cuu/${hit!.category.slug}/${hit!.fn.slug}`}
          className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-[11px] text-blue-700 hover:bg-blue-100 transition-colors"
        >
          {hit!.fn.name}
        </Link>
      ))}
    </div>
  );
}
