/**
 * Download a file from a URL or Blob
 * @param url - URL or Blob to download
 * @param filename - Filename for the downloaded file
 */
export function downloadFile(url: string | Blob, filename: string): void {
  const link = document.createElement("a");

  if (url instanceof Blob) {
    link.href = URL.createObjectURL(url);
  } else {
    link.href = url;
  }

  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up blob URL if created
  if (url instanceof Blob) {
    URL.revokeObjectURL(link.href);
  }
}
