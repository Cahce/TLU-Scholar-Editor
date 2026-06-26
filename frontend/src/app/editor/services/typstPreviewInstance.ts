/**
 * Module-singleton holder for `TypstPreviewClient`.
 *
 * The preview pane (`useTypstPreview`) and the inline math preview
 * (`MathPreviewExtension`) both need a Typst compiler worker. Spinning up
 * one WASM-backed worker per consumer would burn ~3s of cold-start time
 * each and waste memory, so we share a single instance via this module.
 *
 * Lifecycle: lazily created on first `getTypstPreviewClient()` call;
 * `disposeTypstPreviewClient()` is exposed for tests or explicit page
 * teardown. Normal app usage leaves the instance alive for the page's
 * lifetime — the worker itself goes away with the tab.
 */

import { TypstPreviewClient } from "./TypstPreviewClient";

let instance: TypstPreviewClient | null = null;

/** Get the shared client, creating it on first call. */
export function getTypstPreviewClient(): TypstPreviewClient {
  if (!instance) {
    instance = new TypstPreviewClient();
  }
  return instance;
}

/** Tear down the shared client. Safe to call when no instance exists. */
export function disposeTypstPreviewClient(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
