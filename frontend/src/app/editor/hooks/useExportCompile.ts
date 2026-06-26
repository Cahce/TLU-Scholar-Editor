import { useState, useCallback } from "react";
import { useEditorStore } from "../state/editorStore";
import {
  enqueueCompile,
  getCompileJob,
  downloadArtifact,
} from "../../api/compile";
import { downloadAdminProjectPdf } from "../../api/admin/projects";
import type { EditorDiagnostic } from "../types/diagnostics";
import { downloadFile } from "../../lib/downloadFile";

interface ExportState {
  exporting: boolean;
  error: string | null;
}

function getExportFilename(mainPath: string, projectTitle?: string | null): string {
  const basename = mainPath.split("/").pop()?.trim();
  const stem = basename?.replace(/\.[^.]+$/, "");

  if (stem) {
    return `${stem}.pdf`;
  }

  const fallback = projectTitle?.trim() || "document";
  return `${fallback}.pdf`;
}

/**
 * Hook for server-side PDF export
 * Enqueues compile job, polls until complete, downloads artifact
 */
export function useExportCompile(): {
  exporting: boolean;
  error: string | null;
  exportPdf: () => Promise<void>;
} {
  const [state, setState] = useState<ExportState>({
    exporting: false,
    error: null,
  });

  const projectId = useEditorStore((s) => s.projectId);
  const settings = useEditorStore((s) => s.settings);
  const project = useEditorStore((s) => s.project);
  const readOnly = useEditorStore((s) => s.readOnly);
  const setCompileJob = useEditorStore((s) => s.setCompileJob);
  const setDiagnostics = useEditorStore((s) => s.setDiagnostics);
  const diagnostics = useEditorStore((s) => s.diagnostics);
  const flushDirtyDrafts = useEditorStore((s) => s.flushDirtyDrafts);

  const exportPdf = useCallback(async () => {
    // Read-only (admin view-in-workspace): the viewer is not the project
    // owner/member, so the normal enqueue endpoint would 403. Instead use the
    // admin compile-on-demand endpoint (GET /admin/projects/:id/artifact),
    // which compiles server-side if needed, persists the artifact, and streams
    // the PDF — the same path the admin projects list uses.
    if (readOnly) {
      if (!projectId) {
        setState({ exporting: false, error: "Không có dự án để xuất PDF" });
        return;
      }
      setState({ exporting: true, error: null });
      try {
        const blob = await downloadAdminProjectPdf(projectId);
        const filename = getExportFilename(settings?.mainPath ?? "", project?.title);
        downloadFile(blob, filename);
        setState({ exporting: false, error: null });
      } catch (err) {
        const status =
          err && typeof err === "object" && "status" in err
            ? (err as { status?: number }).status
            : undefined;
        const backendMsg = err instanceof Error ? err.message : undefined;
        const message =
          status === 408
            ? "Biên dịch PDF quá thời gian (kiểm tra worker biên dịch)."
            : status === 422
              ? backendMsg || "Dự án có lỗi biên dịch nên không tạo được PDF."
              : status === 403
                ? "Bạn không có quyền xuất PDF cho dự án này."
                : backendMsg || "Không tải được PDF.";
        setState({ exporting: false, error: message });
      }
      return;
    }
    if (!projectId || !settings?.mainPath) {
      setState({ exporting: false, error: "No project or mainPath configured" });
      return;
    }

    setState({ exporting: true, error: null });

    try {
      // 0. Save any unsaved local drafts before exporting so the server snapshot
      // matches the content currently visible in the editor/preview.
      await flushDirtyDrafts();

      // 1. Enqueue compile job
      const { job: initialJob } = await enqueueCompile(projectId, {
        entryPath: settings.mainPath,
      });

      setCompileJob({
        jobId: initialJob.id,
        status: initialJob.status,
        startedAt: initialJob.createdAt,
        diagnostics: [],
        artifactReady: false,
      });

      // 2. Poll until complete
      let currentJob = initialJob;
      const pollInterval = 1000; // 1 second
      const maxPolls = 60; // 60 seconds max
      let pollCount = 0;

      while (
        (currentJob.status === "queued" || currentJob.status === "running") &&
        pollCount < maxPolls
      ) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        const { job } = await getCompileJob(projectId, currentJob.id);
        currentJob = job;
        pollCount++;

        setCompileJob({
          jobId: currentJob.id,
          status: currentJob.status,
          startedAt: currentJob.createdAt,
          diagnostics: [],
          artifactReady: currentJob.status === "success",
        });
      }

      // 3. Handle result
      if (currentJob.status === "success") {
        // Download artifact
        const blob = await downloadArtifact(projectId, currentJob.id);
        const filename = getExportFilename(settings.mainPath, project?.title);
        downloadFile(blob, filename);

        // Clear server diagnostics on success
        const clientDiagnostics = diagnostics.filter((d) => d.source === "client");
        setDiagnostics(clientDiagnostics);

        setState({ exporting: false, error: null });
      } else if (currentJob.status === "failed") {
        // Parse server diagnostics from job
        const serverDiagnostics: EditorDiagnostic[] = (currentJob.diagnostics ?? []).map(
          (d) => ({
            severity: d.severity as "error" | "warning" | "hint" | "info",
            message: d.message,
            range: d.range
              ? {
                  start: { line: d.range.start.line, column: d.range.start.column },
                  end: { line: d.range.end.line, column: d.range.end.column },
                }
              : undefined,
            file: d.file,
            hints: d.hints,
            source: "server" as const,
          }),
        );

        // Merge with client diagnostics
        const clientDiagnostics = diagnostics.filter((d) => d.source === "client");
        setDiagnostics([...clientDiagnostics, ...serverDiagnostics]);

        setState({
          exporting: false,
          error: "Compile failed. See Issues panel for details.",
        });
      } else {
        // Timeout or unknown status
        setState({
          exporting: false,
          error: `Compile timeout or unknown status: ${currentJob.status}`,
        });
      }
    } catch (err) {
      setState({
        exporting: false,
        error: err instanceof Error ? err.message : "Export failed",
      });
    }
  }, [
    projectId,
    settings,
    project,
    readOnly,
    diagnostics,
    flushDirtyDrafts,
    setCompileJob,
    setDiagnostics,
  ]);

  return {
    exporting: state.exporting,
    error: state.error,
    exportPdf,
  };
}
