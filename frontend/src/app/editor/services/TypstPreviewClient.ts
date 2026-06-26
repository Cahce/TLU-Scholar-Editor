import type { EditorDiagnostic } from '../types/diagnostics';
import { contentHash } from './workerSessionState';

// ============================================================================
// Type Definitions
// ============================================================================

type CompileFormat = 'pdf' | 'svg' | 'svg-incremental';

/**
 * KC-B (spec: typst-preview-keystroke-cost) — must match the worker's sentinel.
 * The worker rejects a delta it can't apply with this message; the client then
 * retries the SAME request once as a full upload.
 */
const NEED_RESYNC = '__TLU_NEED_RESYNC__';

/** Rough payload size for the dev cost log (string length ≈ bytes for our
 * mostly-ASCII Typst sources; binaries use their exact byte length). */
function approxPayloadBytes(files: Record<string, string | Uint8Array>): number {
  let n = 0;
  for (const c of Object.values(files)) {
    n += typeof c === 'string' ? c.length : c.byteLength;
  }
  return n;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(2)}MB`;
}

/**
 * Mirrors the worker's `HeadingLocation` (kept duplicated to avoid pulling the
 * worker module into the main bundle). `page` is 1-based; coordinates are pt.
 */
export interface HeadingLocation {
  level: number;
  body: string;
  page: number;
  xPt: number;
  yPt: number;
}

export interface TypstCompileOptions {
  root?: string;
  /**
   * Fragment compile (math/chem widget previews) that rides ON TOP of the
   * worker's live project session instead of replacing its filesystem —
   * keeps the document's incremental compile session warm.
   */
  overlay?: boolean;
}

type CompileRequest = {
  type: 'compile';
  id: string;
  /** Full snapshot (resync) OR — when `knownPaths` is set — only the files
   * that changed since the last successful compile (KC-B delta upload). */
  files: Record<string, string | Uint8Array>;
  mainFile: string;
  root?: string;
  format?: CompileFormat;
  overlay?: boolean;
  /** KC-B: full current path list. Present ⇒ `files` is a delta. */
  knownPaths?: string[];
};

type QueryHeadingsRequest = {
  type: 'query-headings';
  id: string;
  files: Record<string, string | Uint8Array>;
  mainFile: string;
  root?: string;
};

type QueryHeadingsResponse =
  | { type: 'query-headings-result'; id: string; ok: true; headings: HeadingLocation[] }
  | { type: 'query-headings-result'; id: string; ok: false; error: string };

type CompileResponse =
  | {
      type: 'compile-result';
      id: string;
      ok: true;
      format: 'pdf';
      pdf: ArrayBuffer;
      diagnostics: EditorDiagnostic[];
    }
  | {
      type: 'compile-result';
      id: string;
      ok: true;
      format: 'svg';
      svg: string;
      diagnostics: EditorDiagnostic[];
    }
  | {
      type: 'compile-result';
      id: string;
      ok: true;
      format: 'svg-incremental';
      svg: string;
      isFirstFrame: boolean;
      diagnostics: EditorDiagnostic[];
    }
  | {
      type: 'compile-result';
      id: string;
      ok: false;
      format: CompileFormat;
      error: string;
      diagnostics: EditorDiagnostic[];
    };

type PendingPdf = {
  kind: 'pdf';
  resolve: (value: { pdf: Uint8Array<ArrayBuffer>; diagnostics: EditorDiagnostic[] }) => void;
  reject: (reason: unknown) => void;
};

type PendingSvg = {
  kind: 'svg';
  resolve: (value: { svg: string; diagnostics: EditorDiagnostic[] }) => void;
  reject: (reason: unknown) => void;
};

type PendingSvgIncremental = {
  kind: 'svg-incremental';
  resolve: (value: {
    svg: string;
    isFirstFrame: boolean;
    diagnostics: EditorDiagnostic[];
  }) => void;
  reject: (reason: unknown) => void;
};

type PendingHeadings = {
  kind: 'headings';
  resolve: (value: HeadingLocation[]) => void;
  reject: (reason: unknown) => void;
};

type Pending = PendingPdf | PendingSvg | PendingSvgIncremental | PendingHeadings;

// ============================================================================
// Typst Preview Client
// ============================================================================

/**
 * Client for communicating with the Typst WASM worker.
 * Handles message passing, request tracking, and worker lifecycle.
 */
export class TypstPreviewClient {
  #worker: Worker;
  #pending = new Map<string, Pending>();

  // ── KC-B delta-upload mirror ──────────────────────────────────────────────
  // Our best guess of what the worker's VFS session currently holds, so the
  // next compile can send ONLY the files that changed. `null` ⇒ unknown →
  // send everything (full/resync). Keyed implicitly by (root, mainFile): a
  // change in either forces a full send. The worker validates every delta and
  // asks us to resync if our guess is wrong, so this never risks correctness.
  #syncedFiles: Map<string, string> | null = null;
  #syncedRoot: string | null = null;
  #syncedMain: string | null = null;

  constructor() {
    this.#worker = new Worker(
      new URL('./typstWorker.ts', import.meta.url),
      { type: 'module' }
    );

    this.#worker.addEventListener(
      'message',
      (event: MessageEvent<CompileResponse | QueryHeadingsResponse>) => {
      const message = event.data;
      if (!message) return;

      // Heading-query response (source-mapping support).
      if (message.type === 'query-headings-result') {
        const pending = this.#pending.get(message.id);
        if (!pending || pending.kind !== 'headings') {
          this.#pending.delete(message.id);
          return;
        }
        this.#pending.delete(message.id);
        if (message.ok) {
          pending.resolve(message.headings);
        } else {
          pending.reject(new Error(message.error));
        }
        return;
      }

      if (message.type !== 'compile-result') return;

      const pending = this.#pending.get(message.id);
      if (!pending) {
        console.warn('[TypstPreviewClient] Received response for unknown request:', message.id);
        return;
      }

      this.#pending.delete(message.id);

      if (pending.kind === 'headings') {
        pending.reject(new Error('Headings request unexpectedly received compile response'));
        return;
      }

      if (!message.ok) {
        const err = Object.assign(new Error(message.error), {
          diagnostics: message.diagnostics,
        });
        pending.reject(err);
        return;
      }

      if (pending.kind === 'pdf' && message.format === 'pdf') {
        pending.resolve({
          pdf: new Uint8Array(message.pdf),
          diagnostics: message.diagnostics,
        });
        return;
      }
      if (pending.kind === 'svg' && message.format === 'svg') {
        pending.resolve({
          svg: message.svg,
          diagnostics: message.diagnostics,
        });
        return;
      }
      if (pending.kind === 'svg-incremental' && message.format === 'svg-incremental') {
        pending.resolve({
          svg: message.svg,
          isFirstFrame: message.isFirstFrame,
          diagnostics: message.diagnostics,
        });
        return;
      }

      pending.reject(new Error(`Unexpected response format: ${message.format}`));
    },
  );

    this.#worker.addEventListener('error', (event) => {
      console.error('[TypstPreviewClient] Worker error:', event);

      for (const pending of this.#pending.values()) {
        pending.reject(new Error('Worker error: ' + event.message));
      }
      this.#pending.clear();
    });

    console.log('[TypstPreviewClient] Client initialized');
  }

  #newId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : String(Date.now() + Math.random());
  }

  /**
   * KC-B: decide what to actually post for `files`. Returns the delta (or full
   * set) to send, the matching `knownPaths` (`undefined` ⇒ full upload), the
   * fingerprint of the CURRENT full set (adopted as the new mirror on success),
   * and whether this call should update the mirror at all.
   */
  #planSend(
    files: Record<string, string | Uint8Array>,
    mainFile: string,
    root: string | undefined,
    overlay: boolean,
  ): {
    postFiles: Record<string, string | Uint8Array>;
    knownPaths: string[] | undefined;
    current: Map<string, string>;
    track: boolean;
    totalCount: number;
  } {
    const current = new Map<string, string>();
    for (const [p, c] of Object.entries(files)) current.set(p, contentHash(c));
    const totalCount = current.size;

    // Overlay (math/chem widget) compiles use a different, tiny file set and a
    // separate worker code path — never fold them into project delta tracking.
    if (overlay) {
      return { postFiles: files, knownPaths: undefined, current, track: false, totalCount };
    }

    const rootKey = root ?? null;
    const canDelta =
      this.#syncedFiles !== null &&
      this.#syncedRoot === rootKey &&
      this.#syncedMain === mainFile &&
      // No previously-synced file has disappeared (delete/rename ⇒ full send).
      Array.from(this.#syncedFiles.keys()).every((p) => current.has(p));

    if (!canDelta) {
      return { postFiles: files, knownPaths: undefined, current, track: true, totalCount };
    }

    const changed: Record<string, string | Uint8Array> = {};
    for (const [p, h] of current) {
      if (this.#syncedFiles!.get(p) !== h) changed[p] = files[p];
    }
    return {
      postFiles: changed,
      knownPaths: Object.keys(files),
      current,
      track: true,
      totalCount,
    };
  }

  /**
   * Shared post + resync retry for all three compile formats. On a NEED_RESYNC
   * rejection (the worker couldn't apply our delta — new world, deletion, or an
   * overlay clobber) we drop the mirror and retry the SAME request ONCE as a
   * full upload, so a stale guess costs at most one extra send — never a wrong
   * render.
   */
  #attemptCompile<T>(
    kind: Pending['kind'],
    format: CompileFormat,
    files: Record<string, string | Uint8Array>,
    mainFile: string,
    options: TypstCompileOptions,
    allowResync: boolean,
  ): Promise<T> {
    const overlay = options.overlay ?? false;
    const plan = this.#planSend(files, mainFile, options.root, overlay);
    const id = this.#newId();
    const request: CompileRequest = {
      type: 'compile',
      id,
      files: plan.postFiles,
      mainFile,
      root: options.root,
      format,
      overlay: options.overlay,
      knownPaths: plan.knownPaths,
    };

    if (import.meta.env.DEV) {
      console.debug(
        `[TypstPreviewClient] ${format} send mode=${plan.knownPaths ? 'delta' : 'full'} ` +
          `files=${Object.keys(plan.postFiles).length}/${plan.totalCount} ` +
          `~${formatBytes(approxPayloadBytes(plan.postFiles))}`,
      );
    }

    return new Promise<T>((resolve, reject) => {
      const onResolve = (value: unknown): void => {
        if (plan.track) {
          this.#syncedFiles = plan.current;
          this.#syncedRoot = options.root ?? null;
          this.#syncedMain = mainFile;
        }
        resolve(value as T);
      };
      const onReject = (err: unknown): void => {
        if (allowResync && err instanceof Error && err.message === NEED_RESYNC) {
          this.#syncedFiles = null;
          this.#syncedRoot = null;
          this.#syncedMain = null;
          this.#attemptCompile<T>(kind, format, files, mainFile, options, false).then(
            resolve,
            reject,
          );
          return;
        }
        reject(err);
      };
      this.#pending.set(id, { kind, resolve: onResolve, reject: onReject } as Pending);
      this.#worker.postMessage(request);
    });
  }

  /**
   * Compile Typst files to PDF. Sends only the files that changed since the
   * last successful compile (KC-B); the worker fills the rest from its live
   * session.
   */
  compilePdf(
    files: Record<string, string | Uint8Array>,
    mainFile: string,
    options: TypstCompileOptions = {},
  ): Promise<{ pdf: Uint8Array<ArrayBuffer>; diagnostics: EditorDiagnostic[] }> {
    return this.#attemptCompile('pdf', 'pdf', files, mainFile, options, true);
  }

  /**
   * Compile Typst files to SVG (string). Overlay (widget) compiles always send
   * their full fragment set; project compiles send a KC-B delta.
   */
  compileSvg(
    files: Record<string, string | Uint8Array>,
    mainFile: string,
    options: TypstCompileOptions = {},
  ): Promise<{ svg: string; diagnostics: EditorDiagnostic[] }> {
    return this.#attemptCompile('svg', 'svg', files, mainFile, options, true);
  }

  /**
   * Compile Typst files to SVG using the worker's incremental pipeline
   * (Phase 2): the worker keeps a renderer session alive, merges each new
   * vector artifact into it and renders via the session — much cheaper than a
   * full render between keystrokes. `isFirstFrame: true` means the payload is
   * a fresh full document (session reset or per-frame fallback) and the caller
   * must replace its DOM; `false` means it can patch in place (see
   * `SvgDomPatcher`). Files are sent as a KC-B delta.
   */
  compileSvgIncremental(
    files: Record<string, string | Uint8Array>,
    mainFile: string,
    options: TypstCompileOptions = {},
  ): Promise<{ svg: string; isFirstFrame: boolean; diagnostics: EditorDiagnostic[] }> {
    return this.#attemptCompile(
      'svg-incremental',
      'svg-incremental',
      files,
      mainFile,
      options,
      true,
    );
  }

  /**
   * Query the compiled document for heading metadata. Used by the
   * source-mapping (SyncTeX-equivalent) pipeline to align editor cursor
   * positions with preview regions.
   *
   * @returns Headings ordered as Typst introspection iterates the document.
   *   Empty array if the document has no headings or the query fails.
   */
  queryHeadings(
    files: Record<string, string | Uint8Array>,
    mainFile: string,
    options: TypstCompileOptions = {},
  ): Promise<HeadingLocation[]> {
    const id = this.#newId();
    const request: QueryHeadingsRequest = {
      type: 'query-headings',
      id,
      files,
      mainFile,
      root: options.root,
    };
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { kind: 'headings', resolve, reject });
      this.#worker.postMessage(request);
    });
  }

  dispose(): void {
    console.log('[TypstPreviewClient] Disposing client');

    this.#worker.terminate();

    for (const pending of this.#pending.values()) {
      pending.reject(new Error('Worker terminated'));
    }
    this.#pending.clear();
  }

  hasPendingRequests(): boolean {
    return this.#pending.size > 0;
  }

  getPendingCount(): number {
    return this.#pending.size;
  }
}
