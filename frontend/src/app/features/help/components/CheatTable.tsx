import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../../components/ui/utils";
import { getFn } from "../reference";
import { ParamPreview } from "./ParamPreview";

export interface CheatRow {
  syntax: string;
  meaning: string;
  /** Hàm Typst tương ứng để mở xem tham số (tùy chọn). */
  ref?: { category: string; fn: string };
}

/**
 * Bảng tra nhanh cú pháp; dòng nào có `ref` (và hàm tồn tại trong registry) thì
 * thêm nút "Tham số" mở rộng inline bảng tham số của hàm đó.
 */
export function CheatTable({ rows }: { rows: CheatRow[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-slate-500">
            <th className="px-4 py-2.5 font-semibold w-2/5">Cú pháp</th>
            <th className="px-4 py-2.5 font-semibold">Ý nghĩa</th>
            <th className="px-4 py-2.5 font-semibold w-px" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => {
            const hasRef = !!row.ref && !!getFn(row.ref.category, row.ref.fn);
            const isOpen = openIndex === i;
            return (
              <Fragment key={`${row.syntax}-${i}`}>
                <tr className="align-top hover:bg-slate-50/60">
                  <td className="px-4 py-2.5">
                    <code className="font-mono text-[13px] text-slate-800 whitespace-pre-wrap">{row.syntax}</code>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{row.meaning}</td>
                  <td className="px-4 py-2.5 text-right">
                    {hasRef && (
                      <button
                        type="button"
                        onClick={() => setOpenIndex(isOpen ? null : i)}
                        aria-expanded={isOpen}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-blue-50 hover:text-[#007bff] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007bff] whitespace-nowrap"
                      >
                        Tham số
                        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
                      </button>
                    )}
                  </td>
                </tr>
                {hasRef && isOpen && row.ref && (
                  <tr>
                    <td colSpan={3} className="px-4 py-3 bg-slate-50/60">
                      <div role="region" aria-label={`Tham số của ${row.ref.fn}`}>
                        <ParamPreview category={row.ref.category} fn={row.ref.fn} />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
