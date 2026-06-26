import { Loader2 } from "lucide-react";

/**
 * Shown while a protected route's loader validates the session (`/auth/me`)
 * on first load, so the user never sees a blank screen or a flash of
 * protected content before the guard resolves.
 */
export function AuthLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f8fafc] text-slate-600">
      <Loader2 className="w-7 h-7 animate-spin text-[#007bff]" aria-hidden="true" />
      <p className="text-sm font-medium" role="status">
        Đang tải...
      </p>
    </div>
  );
}
