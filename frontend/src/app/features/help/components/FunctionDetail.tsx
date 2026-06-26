import { ExternalLink } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { CodeBlock } from "./CodeBlock";
import { Callout } from "./Callout";
import { Example, PreviewImage } from "./Example";
import { ParamTable } from "./ParamTable";
import type { ReferenceExample, ReferenceFn, RefKind } from "../reference/types";

/** Hiển thị một ví dụ áp dụng tham số: code + ảnh (nếu có snapshotId). */
function ExampleItem({ ex, fnName }: { ex: ReferenceExample; fnName: string }) {
  if (ex.snapshotId) {
    return (
      <Example code={ex.code} caption={ex.caption}>
        <PreviewImage id={`ref/${ex.snapshotId}`} alt={ex.caption ?? `Ví dụ ${fnName}`} />
      </Example>
    );
  }
  return <CodeBlock code={ex.code} caption={ex.caption} />;
}

const KIND_LABEL: Record<RefKind, string> = {
  function: "Hàm",
  element: "Phần tử",
  type: "Kiểu",
  module: "Module",
  group: "Nhóm",
};

/** Hiển thị chi tiết một hàm/phần tử Typst: chữ ký, tham số, ví dụ, ảnh, link gốc. */
export function FunctionDetail({ fn }: { fn: ReferenceFn }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <code className="font-mono text-lg font-semibold text-slate-900">{fn.name}</code>
          <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
            {KIND_LABEL[fn.kind]}
          </span>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
        >
          <a href={fn.docUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Tài liệu gốc
          </a>
        </Button>
      </div>

      <div className="p-5 sm:p-6 space-y-4 text-[15px] leading-relaxed text-slate-700">
        <p id="tom-tat" className="scroll-mt-4">{fn.summary}</p>

        {fn.versionNote && (
          <Callout tone="warning" title="Lưu ý phiên bản">
            {fn.versionNote}
          </Callout>
        )}

        <div id="chu-ky" className="scroll-mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Chữ ký (signature)
          </p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 overflow-x-auto">
            <code className="font-mono text-[13px] text-slate-800 whitespace-pre">{fn.signature}</code>
          </div>
        </div>

        <div id="tham-so" className="scroll-mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Tham số
          </p>
          <ParamTable params={fn.params} />
        </div>

        {(fn.examples?.length || fn.snapshotId) && (
          <div id="vi-du" className="grid md:grid-cols-2 gap-3 items-start scroll-mt-4">
            <div className="space-y-3">
              {fn.examples?.map((ex, i) => (
                <CodeBlock key={i} code={ex} />
              ))}
            </div>
            {fn.snapshotId && (
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <div className="px-3 py-1.5 border-b border-slate-200 bg-slate-100/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Kết quả
                </div>
                <div className="p-4">
                  <PreviewImage id={`ref/${fn.snapshotId}`} alt={`Kết quả của ${fn.name}`} />
                </div>
              </div>
            )}
          </div>
        )}

        {fn.paramExamples && fn.paramExamples.length > 0 && (
          <div id="vi-du-tham-so" className="scroll-mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 pt-1">
              Ví dụ áp dụng tham số
            </p>
            <div className="space-y-3">
              {fn.paramExamples.map((ex, i) => (
                <ExampleItem key={i} ex={ex} fnName={fn.name} />
              ))}
            </div>
          </div>
        )}

        {fn.members && fn.members.length > 0 && (
          <div id="dinh-nghia-con" className="scroll-mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 pt-1">
              Định nghĩa con
            </p>
            <div className="space-y-3">
              {fn.members.map((m) => (
                <div
                  key={m.slug}
                  id={m.slug}
                  className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 scroll-mt-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <code className="font-mono text-[15px] font-semibold text-slate-900">{m.name}</code>
                    <a
                      href={m.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#007bff] hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Tài liệu
                    </a>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{m.summary}</p>
                  {m.signature && (
                    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 mb-2 overflow-x-auto">
                      <code className="font-mono text-[12px] text-slate-700 whitespace-pre">{m.signature}</code>
                    </div>
                  )}
                  {m.params.length > 0 && <ParamTable params={m.params} />}
                  {m.paramExamples && m.paramExamples.length > 0 && (
                    <div className="space-y-3 mt-3">
                      {m.paramExamples.map((ex, i) => (
                        <ExampleItem key={i} ex={ex} fnName={m.name} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
