import { formatBytes } from "../../utils/formatBytes";

interface MetadataCardProps {
  format: string;
  resolution?: string | null;
  sizeBytes: number | null;
  lastChangedAt: string | null;
  mimeType?: string | null;
  path: string;
}

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MetadataCard({
  format,
  resolution,
  sizeBytes,
  lastChangedAt,
  mimeType,
  path,
}: MetadataCardProps): JSX.Element {
  const oversized = sizeBytes != null && sizeBytes > 10 * 1024 * 1024;

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">Tệp</p>
        <h3 className="text-sm font-semibold text-slate-900 truncate" title={path}>
          {basename(path)}
        </h3>
      </div>
      <dl className="px-4 py-3 grid grid-cols-[minmax(110px,auto)_1fr] gap-x-4 gap-y-2 text-[13px]">
        <dt className="text-slate-500">Format:</dt>
        <dd className="text-slate-900 font-medium">{format}</dd>

        {resolution !== undefined && (
          <>
            <dt className="text-slate-500">Resolution:</dt>
            <dd className="text-slate-900 font-medium">{resolution ?? "—"}</dd>
          </>
        )}

        <dt className="text-slate-500">Size:</dt>
        <dd className={oversized ? "text-amber-700 font-medium" : "text-slate-900 font-medium"}>
          {formatBytes(sizeBytes)}
          {oversized && <span className="ml-1 text-[11px] text-amber-600">(lớn)</span>}
        </dd>

        <dt className="text-slate-500">Last changed:</dt>
        <dd className="text-slate-900 font-medium">{formatTimestamp(lastChangedAt)}</dd>

        {mimeType && (
          <>
            <dt className="text-slate-500">MIME:</dt>
            <dd className="text-slate-500 text-[12px] font-mono truncate" title={mimeType}>
              {mimeType}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
