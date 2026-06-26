import { apiClient, authorizedFetch } from "./client";
import type {
  CompileJobResponse,
  EnqueueCompileRequest,
} from "../types/api";

/**
 * Enqueue a new compile job
 * Returns 202 Accepted with job details
 */
export async function enqueueCompile(
  projectId: string,
  body: EnqueueCompileRequest = {},
): Promise<{ job: CompileJobResponse }> {
  return apiClient.post<never, { job: CompileJobResponse }>(
    `/projects/${projectId}/compile`,
    body,
  );
}

/**
 * List all compile jobs for a project
 * Sorted by createdAt descending
 */
export async function listCompileJobs(
  projectId: string,
): Promise<{ jobs: CompileJobResponse[] }> {
  return apiClient.get<never, { jobs: CompileJobResponse[] }>(
    `/projects/${projectId}/compile`,
  );
}

/**
 * Get a single compile job by ID
 * Use for polling job status
 */
export async function getCompileJob(
  projectId: string,
  jobId: string,
): Promise<{ job: CompileJobResponse }> {
  return apiClient.get<never, { job: CompileJobResponse }>(
    `/projects/${projectId}/compile/${jobId}`,
  );
}

/**
 * Download artifact (PDF) for a compile job
 * Returns a Blob that can be downloaded or displayed
 *
 * Note: This uses `authorizedFetch` (not apiClient) because we need the raw
 * binary response (Blob). `authorizedFetch` injects the Bearer token and handles
 * silent refresh / 401 redirect consistently with the rest of the app.
 */
export async function downloadArtifact(
  projectId: string,
  jobId: string,
): Promise<Blob> {
  const baseURL =
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";

  const res = await authorizedFetch(
    `${baseURL}/projects/${projectId}/compile/${jobId}/artifact`,
  );

  if (res.status === 401) {
    // authorizedFetch already cleared auth + redirected to login.
    throw new Error("Chưa đăng nhập hoặc token không hợp lệ");
  }

  if (!res.ok) {
    throw new Error(`Artifact download failed: ${res.status}`);
  }

  return await res.blob();
}

/**
 * Compile a project to PDF and return the resulting PDF Blob.
 *
 * Owner/member flow (there is no owner-facing one-shot compile-and-download
 * endpoint — that one is admin-only): enqueue a compile job, poll until it
 * finishes, then download the artifact. This mirrors the editor's
 * `useExportCompile` loop but is store-free, so list screens (e.g. the student/
 * teacher dashboard) can trigger a PDF download with only a `projectId`.
 *
 * Throws with a Vietnamese message on compile failure or timeout.
 */
export async function compileProjectPdf(
  projectId: string,
  options: {
    entryPath?: string;
    pollIntervalMs?: number;
    maxPolls?: number;
  } = {},
): Promise<Blob> {
  const pollInterval = options.pollIntervalMs ?? 1000;
  const maxPolls = options.maxPolls ?? 60;

  // 1. Enqueue. Omitting `entryPath` lets the backend fall back to the
  //    project's configured `settings.mainPath` (the compile entry point).
  const { job } = await enqueueCompile(
    projectId,
    options.entryPath ? { entryPath: options.entryPath } : {},
  );

  // 2. Poll until the job leaves queued/running (or the timeout budget elapses).
  let current = job;
  let polls = 0;
  while (
    (current.status === "queued" || current.status === "running") &&
    polls < maxPolls
  ) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    const next = await getCompileJob(projectId, current.id);
    current = next.job;
    polls += 1;
  }

  // 3. Resolve the outcome.
  if (current.status === "success") {
    return downloadArtifact(projectId, current.id);
  }
  if (current.status === "failed") {
    throw new Error(
      "Biên dịch PDF thất bại. Hãy mở dự án để xem chi tiết lỗi.",
    );
  }
  throw new Error("Biên dịch PDF quá thời gian chờ. Vui lòng thử lại.");
}
