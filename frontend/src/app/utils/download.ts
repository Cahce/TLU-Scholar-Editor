/**
 * Browser download utilities.
 *
 * Used by the project export flow to save a Blob from the API as a file on
 * the user's machine. Keeps cleanup well-bounded (`URL.revokeObjectURL` on a
 * short timer) and never leaks anchor elements past the click.
 */

/**
 * Trigger a "Save As" download in the browser for the given Blob.
 *
 * @param blob     Bytes to save.
 * @param filename Suggested filename. Sanitize-on-call: callers should pass
 *                 a filename already safe for cross-platform filesystems.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke until the browser has had a chance to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Trigger a download for an already-existing URL (e.g. a blob: object URL from
 * the live preview). Unlike {@link downloadBlob} this does NOT revoke the URL —
 * callers pass a URL owned elsewhere that is still in use (the preview keeps
 * rendering from it), so revoking would break the on-screen PDF.
 */
export function downloadUrl(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Sanitize a string for use as a filename across platforms.
 *
 * Strips characters disallowed on Windows / macOS / Linux and collapses
 * whitespace into single hyphens. Preserves Unicode letters (so Vietnamese
 * titles like "Khóa Luận Tốt Nghiệp" survive intact).
 */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[^\p{L}\p{N}\- _]+/gu, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (cleaned || "project").slice(0, 80);
}

/**
 * Compose a default filename for a project export.
 *
 * Format: `<sanitized-title>-YYYYMMDD.zip`
 */
export function defaultExportFilename(projectTitle: string): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${sanitizeFilename(projectTitle)}-${stamp}.zip`;
}
