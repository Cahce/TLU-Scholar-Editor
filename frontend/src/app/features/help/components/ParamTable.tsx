import { Check } from "lucide-react";
import type { ReferenceParam } from "../reference/types";

function Flag({ on, label }: { on?: boolean; label: string }) {
  if (!on) {
    return (
      <span className="text-slate-300" aria-label={`Không ${label}`} title={`Không ${label}`}>
        —
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-emerald-600" title={`Có ${label}`}>
      <Check className="w-3.5 h-3.5" aria-hidden="true" />
      <span className="sr-only">Có {label}</span>
    </span>
  );
}

/** Bảng tham số: Tham số / Kiểu / Mặc định / Settable / Positional / Mô tả. */
export function ParamTable({ params }: { params: ReferenceParam[] }) {
  if (params.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="bg-slate-50 text-left text-slate-500">
            <th className="px-3 py-2.5 font-semibold">Tham số</th>
            <th className="px-3 py-2.5 font-semibold">Kiểu</th>
            <th className="px-3 py-2.5 font-semibold">Mặc định</th>
            <th className="px-3 py-2.5 font-semibold text-center">Settable</th>
            <th className="px-3 py-2.5 font-semibold text-center">Positional</th>
            <th className="px-3 py-2.5 font-semibold">Mô tả</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {params.map((p) => (
            <tr key={p.name} className="hover:bg-slate-50/60 align-top">
              <td className="px-3 py-2.5">
                <code className="font-mono text-[13px] font-medium text-slate-800">{p.name}</code>
              </td>
              <td className="px-3 py-2.5">
                <code className="font-mono text-[12px] text-slate-500">{p.type}</code>
              </td>
              <td className="px-3 py-2.5">
                {p.default ? (
                  <code className="font-mono text-[12px] text-slate-500">{p.default}</code>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-center">
                <Flag on={p.settable} label="settable" />
              </td>
              <td className="px-3 py-2.5 text-center">
                <Flag on={p.positional} label="positional" />
              </td>
              <td className="px-3 py-2.5 text-slate-600">{p.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
