/**
 * ZoteroConnectionForm Component
 *
 * Two-step form for connecting to a Zotero account.
 *   Step 1 (credentials): paste API key → verify against api.zotero.org
 *   Step 2 (library):     pick which library (personal or group) to connect
 *
 * Inspired by TeXlyre's ZoteroConnectionModal but inline rather than modal,
 * and auto-derives the numeric user ID from the API key so the user never
 * has to look it up manually.
 */

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import type {
  ConnectZoteroBody,
  VerifyZoteroResponse,
  ZoteroLibrarySummary,
} from "../../../types/bibliography";

interface ZoteroConnectionFormProps {
  onConnected: () => void;
  onVerify: (apiKey: string) => Promise<VerifyZoteroResponse>;
  onConnect: (body: ConnectZoteroBody) => Promise<void>;
}

export function ZoteroConnectionForm({
  onConnected,
  onVerify,
  onConnect,
}: ZoteroConnectionFormProps) {
  const [step, setStep] = useState<"credentials" | "library">("credentials");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [verifyResult, setVerifyResult] = useState<VerifyZoteroResponse | null>(
    null
  );
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>("");

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!apiKey.trim()) {
      setError("Vui lòng nhập API key");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const result = await onVerify(apiKey.trim());
      setVerifyResult(result);
      setSelectedLibraryId(result.libraries[0]?.id ?? "");
      setStep("library");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể xác thực API key"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnect = async () => {
    if (!verifyResult) return;
    const selected = verifyResult.libraries.find(
      (lib) => lib.id === selectedLibraryId
    );
    if (!selected) {
      setError("Vui lòng chọn một thư viện");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onConnect({
        apiKey: apiKey.trim(),
        libraryId: selected.id,
        libraryType: selected.type,
      });
      toast.success("Đã kết nối Zotero thành công");
      onConnected();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể kết nối Zotero";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep("credentials");
    setError(null);
    setVerifyResult(null);
  };

  if (step === "credentials") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-slate-900">Kết nối Zotero</h3>
            <p className="text-sm text-slate-600">
              Dán API key của bạn để tải danh sách thư viện Zotero
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                autoComplete="off"
                placeholder="Nhập API key từ Zotero"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-slate-500">
                <a
                  href="https://www.zotero.org/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#007bff] hover:underline"
                >
                  Lấy API key tại zotero.org/settings/keys
                </a>
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || !apiKey.trim()}
              className="w-full"
            >
              {isSubmitting ? "Đang xác thực..." : "Xác thực"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // step === "library"
  const accountLabel =
    verifyResult?.displayName?.trim() ||
    verifyResult?.username?.trim() ||
    `Zotero #${verifyResult?.userId ?? ""}`;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">Chọn thư viện</h3>
          <p className="text-sm text-slate-600">
            Tài khoản: <span className="font-medium">{accountLabel}</span>
          </p>
        </div>

        <div className="space-y-2">
          <Label>Thư viện</Label>
          {verifyResult && verifyResult.libraries.length === 0 ? (
            <p className="text-sm text-slate-500">
              API key này không truy cập được thư viện nào.
            </p>
          ) : (
            <div className="space-y-2">
              {verifyResult?.libraries.map((lib: ZoteroLibrarySummary) => (
                <label
                  key={`${lib.type}-${lib.id}`}
                  className="flex items-center gap-3 p-3 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="radio"
                    name="library"
                    value={lib.id}
                    checked={selectedLibraryId === lib.id}
                    onChange={() => setSelectedLibraryId(lib.id)}
                    className="w-4 h-4 text-[#007bff] focus:ring-[#007bff]"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">
                      {lib.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {lib.type === "user" ? "Cá nhân" : "Nhóm"} · #{lib.id}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={isSubmitting}
            className="flex-1"
          >
            Quay lại
          </Button>
          <Button
            type="button"
            onClick={handleConnect}
            disabled={isSubmitting || !selectedLibraryId}
            className="flex-1"
          >
            {isSubmitting ? "Đang kết nối..." : "Kết nối"}
          </Button>
        </div>
      </div>
    </div>
  );
}
