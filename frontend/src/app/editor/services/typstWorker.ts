/// <reference lib="webworker" />

import {
  createTypstCompiler,
  createTypstRenderer,
  loadFonts,
  type TypstCompiler,
  type TypstRenderer,
  FetchPackageRegistry,
  MemoryAccessModel,
} from '@myriaddreamin/typst.ts';
import { withAccessModel, withPackageRegistry } from '@myriaddreamin/typst.ts/options.init';
import type { EditorDiagnostic } from '../types/diagnostics';
import {
  detectExtraFontAssets,
  needsAssetReload,
  type ExtraFontAsset,
} from './fontAssetDetection';
import { contentHash, planSessionUpdate } from './workerSessionState';
// fontPreloader.ts + typstFontInjection.ts are intentionally NOT imported here.
// They remain in the codebase for future revisit (eager raw-byte loading would
// fix typst.app-level SVG sharpness) but the eager pattern was reverted due to
// cold-start payload cost — see SVG_RENDER_QUALITY_STATUS.

// ============================================================================
// Type Definitions
// ============================================================================

type CompileFormat = 'pdf' | 'svg' | 'svg-incremental';

/**
 * File content accepted by the compiler:
 *   - `string`: UTF-8 text (typst, bib, markdown, config, ...).
 *   - `Uint8Array`: raw bytes (image, font, pdf). Forwarded to typst.ts via
 *     `compiler.mapShadow` so `#image()` / `#read()` resolve correctly.
 */
type CompileFileContent = string | Uint8Array;

type CompileRequest = {
  type: 'compile';
  id: string;
  /**
   * KC-B delta upload: when `knownPaths` is set this holds ONLY the files that
   * changed since the last successful compile; otherwise it is the full
   * project snapshot (legacy / resync path).
   */
  files: Record<string, CompileFileContent>;
  mainFile: string;
  root?: string;
  format?: CompileFormat;
  /**
   * Fragment compile riding ON TOP of the live project session (math/chem
   * widget previews — a lone `math.typ`). Overlay files are added to the
   * VFS without being counted in the session's delete-detection, so widget
   * renders no longer thrash the document's incremental compile session.
   */
  overlay?: boolean;
  /**
   * KC-B (spec: typst-preview-keystroke-cost): the FULL current path list.
   * Present ⇒ `files` is a delta and the worker fills unsent files from its
   * live VFS session (or asks the client to resync). Absent ⇒ `files` is the
   * complete set (legacy behaviour) and absence-implies-deletion still holds.
   * Ignored for `overlay` compiles.
   */
  knownPaths?: string[];
};

/**
 * Query the compiled document for heading metadata. Used by the source-mapping
 * (SyncTeX-equivalent) flow to discover where each `=` heading was rendered so
 * the UI can correlate editor cursor positions with preview regions.
 */
type QueryHeadingsRequest = {
  type: 'query-headings';
  id: string;
  files: Record<string, CompileFileContent>;
  mainFile: string;
  root?: string;
};

/**
 * A rendered-document heading the source-map pipeline can correlate against.
 * `page` is 1-based; `xPt`/`yPt` are in PDF points (`pt`).
 */
export interface HeadingLocation {
  level: number;
  body: string;
  page: number;
  xPt: number;
  yPt: number;
}

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

type QueryHeadingsResponse =
  | { type: 'query-headings-result'; id: string; ok: true; headings: HeadingLocation[] }
  | { type: 'query-headings-result'; id: string; ok: false; error: string };

// NOTE: the worker no longer holds a long-lived render session. The former
// IP-9 "leak pattern" (parking runWithSession to keep a RenderSession alive
// across frames) caused wasm-bindgen re-entrancy panics — see the render-
// session note near invalidateCompileSession. Each SVG frame is a full render
// from the (still incrementally-compiled) vector artifact.

// ============================================================================
// Configuration
// ============================================================================

// Load WASM from public folder (works offline, faster loading).
//
// The `?v=<version>` query busts the browser HTTP cache when the Typst
// packages are upgraded: the vendored `public/wasm/*.wasm` are synced to the
// installed package version (scripts/sync-typst-wasm.mjs), but the browser
// would otherwise keep serving the previous WASM bytes against the new JS glue
// — a wasm-bindgen ABI skew that surfaces as
// `WebAssembly.instantiate(): Import ... "__wbindgen_cast_*" requires a
// callable`. `__TYPST_WASM_VERSION__` is replaced at build time by Vite
// (see vite.config.ts `define`).
declare const __TYPST_WASM_VERSION__: string;
const WASM_CACHE_BUST =
  typeof __TYPST_WASM_VERSION__ === 'string' ? `?v=${__TYPST_WASM_VERSION__}` : '';
const TYPST_WASM_URL = `/wasm/typst_ts_web_compiler_bg.wasm${WASM_CACHE_BUST}`;
const TYPST_RENDERER_WASM_URL = `/wasm/typst_ts_renderer_bg.wasm${WASM_CACHE_BUST}`;

// ----------------------------------------------------------------------------
// Font strategy for TLU Scholar Editor
// ----------------------------------------------------------------------------
// Declarative URL list — typst.ts's `loadFonts(urls, { assets })` helper
// resolves them lazily at compile time. Bundled CDN asset groups are loaded
// ON DEMAND:
//
//   - 'text' (Libertinus / NewCM / DejaVu — Latin + math fallback): always.
//   - 'cjk' (NotoSerifCJK SC, ~30 MB) and 'emoji' (Twitter/Noto color emoji,
//     ~10 MB): only once a compile's sources actually contain CJK/emoji
//     characters or name such a font family (see fontAssetDetection.ts).
//     TLU documents are Vietnamese (Latin script), so the default session
//     skips ~40 MB and a few hundred font requests; capability is unchanged —
//     the compiler re-initialises with the extra groups the first time
//     they're needed.
//
// We previously experimented with eager raw-byte fetching (see fontPreloader.ts
// / typstFontInjection.ts — kept for now in case we revisit) but the eager
// approach inflated cold-start payload by ~33 MB (Noto CJK SC × 2) and slowed
// initial workspace bootstrap noticeably. Reverted to lazy URLs.
// ----------------------------------------------------------------------------
const CORE_FONTS: string[] = [
  // Body serif — Times New Roman (TLU thesis house style)
  '/fonts/core/times.ttf',
  '/fonts/core/timesbd.ttf',
  '/fonts/core/timesi.ttf',
  '/fonts/core/timesbi.ttf',
  // UI sans — IBM Plex Sans (captions, code, diagrams)
  '/fonts/core/IBMPlexSans-Regular.ttf',
  '/fonts/core/IBMPlexSans-Bold.ttf',
  // Math — New Computer Modern Math (Typst standard)
  '/fonts/core/NewCMMath-Regular.otf',
  '/fonts/core/NewCMMath-Book.otf',
];

function resolveFont(fontPath: string): string {
  return new URL(fontPath, self.location.origin).href;
}

// ============================================================================
// Asset cache (Cache API)
// ============================================================================
// typst.ts fetches its CDN font bundles and `@preview` package tarballs with
// plain `fetch`. Route those immutable asset URLs through the Cache API so
// repeat sessions cost zero network — surviving HTTP-cache eviction and
// working offline (typst.app achieves the same via its ServiceWorker).
// Worker-scope monkey-patch: page fetches are untouched; any failure falls
// back to the native fetch.
const ASSET_CACHE_NAME = 'tlu-typst-assets-v1';

function isCacheableAssetUrl(url: string): boolean {
  return (
    url.includes('packages.typst.org') ||
    url.includes('cdn.jsdelivr.net') ||
    url.includes('unpkg.com') ||
    url.includes('/fonts/') ||
    url.includes('/wasm/')
  );
}

const nativeFetch = self.fetch.bind(self);

async function cachedAssetFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  try {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const method =
      init?.method ?? (input instanceof Request ? input.method : 'GET');
    if (
      method.toUpperCase() !== 'GET' ||
      !isCacheableAssetUrl(url) ||
      typeof caches === 'undefined'
    ) {
      return nativeFetch(input, init);
    }
    const cache = await caches.open(ASSET_CACHE_NAME);
    const hit = await cache.match(url);
    if (hit) return hit;
    const response = await nativeFetch(input, init);
    // Only persist real 200s (skips opaque/partial responses). put() consumes
    // the body — clone first; quota errors are non-fatal.
    if (response.ok && response.status === 200) {
      cache.put(url, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    return nativeFetch(input, init);
  }
}

(self as unknown as { fetch: typeof fetch }).fetch =
  cachedAssetFetch as typeof fetch;

// ============================================================================
// State Management
// ============================================================================

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

// Package registry: resolves `@preview/...` imports by fetching tarballs from
// https://packages.typst.org. Without this the compiler uses a Dummy Registry
// and any `#import "@preview/<name>:<ver>"` fails with "failed to load package".
const accessModel = new MemoryAccessModel();
const packageRegistry = new FetchPackageRegistry(accessModel);

let compilerPromise: Promise<TypstCompiler> | null = null;
let rendererPromise: Promise<TypstRenderer> | null = null;
let compileQueue: Promise<void> = Promise.resolve();
let lastCompileTime = Date.now();

// ── Compile-session state (spec: typst-incremental-preview IP-8) ──────────
// Snapshot of the virtual filesystem from the last successful prepareCompile
// (path → content hash) plus the root it was built for. Lets us SKIP
// `compiler.reset()` and re-add only changed files, so Typst's comemo
// memoisation reuses evaluation of untouched modules between keystrokes.
let sessionFiles: Map<string, string> | null = null;
let sessionRoot: string | null = null;
// Fragment scratch files (math.typ / chem.typ previews) living in the VFS on
// top of the project session. Tracked separately so project compiles don't
// see them as deletions (and fragment recompiles stay incremental too).
let overlayFiles = new Map<string, string>();

function invalidateCompileSession(): void {
  sessionFiles = null;
  sessionRoot = null;
  overlayFiles = new Map();
}

// ── Render session: intentionally NOT reused across frames ────────────────
// typst.ts's `runWithSession` frees the RenderSession the moment its callback
// returns, and its own docs warn the leaked-lifetime pattern is "quite
// bug-prone". Holding a session open across frames (the former IP-9 "leak
// pattern") let a second `create_session` overlap a still-live session on the
// same renderer → wasm-bindgen RefCell panic ("recursive use of an object
// detected which would lead to unsafe aliasing in rust"), which then poisoned
// the renderer so even full renders failed. We now render every SVG frame as a
// full render from the vector artifact. Incremental COMPILE (comemo, IP-8) is
// preserved — only the render-session merge is dropped, and render cost is a
// small fraction of compile (KC-C). See
// .kiro/specs/typst-preview-render-session-reentrancy-fix.

// Extra font asset groups loaded so far (grows monotonically per session).
const loadedExtraAssets = new Set<ExtraFontAsset>();

function currentFontAssets(): ('text' | ExtraFontAsset)[] {
  return ['text', ...loadedExtraAssets];
}

/**
 * Re-initialise the compiler + renderer when the incoming sources need a
 * font asset group that isn't loaded yet (first CJK character / emoji /
 * CJK font family in the project). One-time cost when it happens; sessions
 * that never need them skip ~40 MB of font downloads entirely.
 */
function ensureFontAssets(files: Record<string, CompileFileContent>): void {
  const needed = detectExtraFontAssets(files);
  if (!needsAssetReload(loadedExtraAssets, needed)) return;
  for (const asset of needed) loadedExtraAssets.add(asset);
  console.log(
    '[Typst Worker] Reloading compiler with font assets:',
    currentFontAssets().join(', '),
  );
  compilerPromise = null;
  rendererPromise = null;
  // New compiler/renderer instances = new world: the compile session is stale.
  invalidateCompileSession();
}

// Compiler lifecycle: Reset after 30 minutes of inactivity to free memory
const COMPILER_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// ============================================================================
// Helpers
// ============================================================================

/**
 * Fetches the Typst WASM module
 */
async function fetchWasmModule(): Promise<ArrayBuffer> {
  const absoluteUrl = new URL(TYPST_WASM_URL, self.location.origin).href;
  const response = await fetch(absoluteUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch WASM module: ${response.statusText}`);
  }
  return await response.arrayBuffer();
}

async function fetchRendererWasm(): Promise<ArrayBuffer> {
  const absoluteUrl = new URL(TYPST_RENDERER_WASM_URL, self.location.origin).href;
  const response = await fetch(absoluteUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch renderer WASM: ${response.statusText}`);
  }
  return await response.arrayBuffer();
}

/**
 * Creates a compiler with declarative font URLs + CDN asset fallback.
 */
async function createCompilerWithFonts(fonts: string[]): Promise<TypstCompiler> {
  const compiler = createTypstCompiler();
  const absoluteFonts = fonts.map(resolveFont);

  await compiler.init({
    getModule: fetchWasmModule,
    beforeBuild: [
      // 'text' = Libertinus / NewCM / DejaVu (Latin + math) — always.
      // 'cjk' / 'emoji' join on demand via ensureFontAssets().
      loadFonts(absoluteFonts, {
        assets: currentFontAssets(),
      }),
      withAccessModel(accessModel),
      withPackageRegistry(packageRegistry),
    ],
  });

  return compiler;
}

/**
 * Gets the compiler instance, creating it if necessary
 */
function getCompiler(): Promise<TypstCompiler> {
  // Check if compiler should be reset due to inactivity
  if (compilerPromise && Date.now() - lastCompileTime > COMPILER_IDLE_TIMEOUT) {
    console.log('[Typst Worker] Resetting compiler after idle timeout');
    compilerPromise = null;
    rendererPromise = null;
    invalidateCompileSession();
  }

  if (compilerPromise) return compilerPromise;

  console.log('[Typst Worker] Initializing new compiler instance');
  compilerPromise = createCompilerWithFonts(CORE_FONTS);
  return compilerPromise;
}

/**
 * Lazily creates the renderer (used for SVG output). The renderer reads its
 * own WASM module — it does NOT share state with the compiler.
 *
 * Fonts must be passed to the renderer too: vector artifacts reference fonts
 * by family, and the renderer needs them available to draw text glyphs.
 * Pattern matches references/texlyre/src/extensions/typst.ts/typst-worker.ts.
 */
function getRenderer(): Promise<TypstRenderer> {
  if (rendererPromise) return rendererPromise;

  console.log('[Typst Worker] Initializing renderer instance');
  rendererPromise = (async () => {
    const renderer = createTypstRenderer();
    const absoluteFonts = CORE_FONTS.map(resolveFont);
    await renderer.init({
      getModule: fetchRendererWasm,
      beforeBuild: [
        loadFonts(absoluteFonts, {
          assets: currentFontAssets(),
        }),
      ],
    });
    return renderer;
  })();
  return rendererPromise;
}

/**
 * Parses a single unix-format diagnostic string.
 * Format: "/path/to/file.typ:line:col: severity: message"
 * or just "severity: message" (no location).
 */
function parseUnixDiagnosticLine(line: string): EditorDiagnostic | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Try full format: /file:line:col: severity: message
  const full = trimmed.match(/^([^:]+):(\d+):(\d+):\s*(error|warning|hint|info):\s*(.+)$/i);
  if (full) {
    const severityStr = full[4].toLowerCase() as EditorDiagnostic['severity'];
    return {
      source: 'client',
      severity: severityStr,
      message: full[5],
      file: full[1].replace(/^\//, ''),
      range: {
        start: { line: parseInt(full[2], 10), column: parseInt(full[3], 10) },
        end:   { line: parseInt(full[2], 10), column: parseInt(full[3], 10) },
      },
    };
  }

  // Try short format: severity: message
  const short = trimmed.match(/^(error|warning|hint|info):\s*(.+)$/i);
  if (short) {
    return {
      source: 'client',
      severity: short[1].toLowerCase() as EditorDiagnostic['severity'],
      message: short[2],
    };
  }

  // Plain string — treat as error
  return { source: 'client', severity: 'error', message: trimmed };
}

/**
 * Parses Typst diagnostics into EditorDiagnostic format.
 * Handles both raw compiler objects and unix-format strings.
 */
function parseDiagnostics(diagnostics: any[]): EditorDiagnostic[] {
  if (!diagnostics || diagnostics.length === 0) return [];

  return diagnostics
    .map((diag): EditorDiagnostic | null => {
      try {
        // Unix-format string diagnostic (when diagnostics:'unix' is used)
        if (typeof diag === 'string') {
          return parseUnixDiagnosticLine(diag);
        }

        // Extract severity
        let severity: EditorDiagnostic['severity'] = 'error';
        if (diag.severity) {
          const sev = String(diag.severity).toLowerCase();
          if (sev.includes('warning')) severity = 'warning';
          else if (sev.includes('hint')) severity = 'hint';
          else if (sev.includes('info')) severity = 'info';
        }

        // Extract message
        const message = diag.message || String(diag);

        // Extract file and range from span
        let file: string | undefined;
        let range: EditorDiagnostic['range'] | undefined;

        if (diag.span) {
          // Parse span format: "Span(file.typ:1:5-1:10)" or similar
          const spanStr = String(diag.span);
          const fileMatch = spanStr.match(/([^:]+):(\d+):(\d+)-(\d+):(\d+)/);

          if (fileMatch) {
            file = fileMatch[1].replace(/^\//, ''); // Remove leading slash
            range = {
              start: {
                line: parseInt(fileMatch[2], 10),
                column: parseInt(fileMatch[3], 10),
              },
              end: {
                line: parseInt(fileMatch[4], 10),
                column: parseInt(fileMatch[5], 10),
              },
            };
          }
        }

        // Extract hints
        const hints: string[] = [];
        if (diag.hints && Array.isArray(diag.hints)) {
          hints.push(...diag.hints.map(String));
        }

        return {
          source: 'client',
          severity,
          message,
          file,
          range,
          hints: hints.length > 0 ? hints : undefined,
        };
      } catch (error) {
        console.error('[Typst Worker] Failed to parse diagnostic:', error, diag);
        return null;
      }
    })
    .filter((d): d is EditorDiagnostic => d !== null);
}

// ============================================================================
// Compilation
// ============================================================================

// KC-B (spec: typst-preview-keystroke-cost) — delta upload protocol.
// The client normally sends only the files that CHANGED since the last
// successful compile plus `knownPaths` (the full current path list). When the
// worker's live VFS session can't be trusted to fill in the unsent files
// (no session yet, root changed, a tracked file vanished = delete/rename, or a
// font-asset reload just wiped the world), we throw this sentinel. The client
// catches it and immediately retries the SAME request as a full upload — so
// correctness never depends on the delta being applicable; the worst case is
// one extra full send (identical to the pre-KC-B behaviour).
const NEED_RESYNC = '__TLU_NEED_RESYNC__';

function needResyncError(reason: string): Error {
  return Object.assign(new Error(NEED_RESYNC), { needResync: true, resyncReason: reason });
}

function addToVfs(compiler: TypstCompiler, path: string, content: CompileFileContent): void {
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  if (typeof content === 'string') {
    compiler.addSource(normalizedPath, content);
  } else {
    // Binary: typst.ts uses `mapShadow` to overlay raw bytes onto the
    // virtual filesystem (images, fonts, embedded PDFs). Typst's
    // `#image()`, `#read()`, and font lookup all read through this layer.
    (compiler as any).mapShadow(normalizedPath, content);
  }
}

async function prepareCompile(
  files: Record<string, CompileFileContent>,
  mainFile: string,
  root?: string,
  overlay = false,
  knownPaths?: string[],
): Promise<{ compiler: TypstCompiler; mainPath: string; rootPath: string }> {
  lastCompileTime = Date.now();

  // CJK/emoji content (or font families) appearing for the first time forces
  // a one-off compiler+renderer re-init with the extra font groups.
  ensureFontAssets(files);

  const compiler = await getCompiler();
  const rootPath = normalizeCompileRoot(root);
  const mainPath = mainFile.startsWith('/') ? mainFile : '/' + mainFile;

  // Overlay compiles (math/chem widget fragments) ride ON TOP of the live
  // project session: update only the incoming scratch files, never reset.
  // Without this, every widget render would look like "all project files
  // were deleted" and thrash the session into full recompiles.
  if (overlay && sessionFiles && sessionRoot === rootPath) {
    try {
      for (const [path, content] of Object.entries(files)) {
        const hash = contentHash(content);
        if (overlayFiles.get(path) === hash) continue;
        addToVfs(compiler, path, content);
        overlayFiles.set(path, hash);
        // If a REAL project file shares this path, its VFS content was just
        // clobbered — evict it from the snapshot so the next project compile
        // re-adds the genuine content instead of trusting a stale hash.
        sessionFiles.delete(path);
      }
    } catch (err) {
      invalidateCompileSession();
      throw err;
    }
    return { compiler, mainPath, rootPath };
  }

  if (overlay) {
    // No live session to ride on (widget rendered before the first project
    // compile). Bootstrap with an EMPTY project snapshot so the upcoming
    // project compile is purely additive — no false deletion → no reset.
    await compiler.reset();
    try {
      overlayFiles = new Map();
      for (const [path, content] of Object.entries(files)) {
        addToVfs(compiler, path, content);
        overlayFiles.set(path, contentHash(content));
      }
      sessionFiles = new Map();
      sessionRoot = rootPath;
    } catch (err) {
      invalidateCompileSession();
      throw err;
    }
    return { compiler, mainPath, rootPath };
  }

  // KC-B delta upload: the client sent only the changed files (`files`) plus
  // the full current path list (`knownPaths`). Apply the changes on top of the
  // live session WITHOUT re-receiving the untouched files. Any condition where
  // the VFS can't be trusted to already hold the unsent files → NEED_RESYNC,
  // and the client retries the request as a full upload (handled below).
  if (knownPaths) {
    if (!sessionFiles || sessionRoot !== rootPath) {
      throw needResyncError('no-session-or-root-change');
    }
    const known = new Set(knownPaths);
    // A file the worker is tracking but the client no longer lists = a delete
    // or rename. The VFS would keep serving the stale file → resync.
    for (const path of sessionFiles.keys()) {
      if (!known.has(path)) throw needResyncError('deleted-or-renamed');
    }
    // A listed file the worker has never seen and that wasn't sent in this
    // delta = we can't materialise it (e.g. overlay clobbered it) → resync.
    for (const path of knownPaths) {
      if (!sessionFiles.has(path) && !(path in files)) {
        throw needResyncError('missing-base-file');
      }
    }
    try {
      for (const path of Object.keys(files)) {
        addToVfs(compiler, path, files[path]);
        sessionFiles.set(path, contentHash(files[path]));
      }
    } catch (err) {
      invalidateCompileSession();
      throw err;
    }
    if (Object.keys(files).length > 0) {
      console.log(
        `[Typst Worker] VFS delta update: ${Object.keys(files).length}/${knownPaths.length} file(s) re-added`,
      );
    }
    return { compiler, mainPath, rootPath };
  }

  // Incremental VFS update (spec: typst-incremental-preview IP-8). A live
  // session only re-adds files whose content hash changed, so Typst's comemo
  // cache keeps evaluation of untouched modules. Anything that could leave
  // stale state (no session, root change, deleted/renamed file) plans a
  // 'full' update: reset() then re-add everything — exactly the old
  // behaviour. reset() only clears source files, NOT the loaded fonts; it is
  // async, and awaiting it avoids a race where addSource lands before the
  // internal state is fully cleared (visible on quick PDF→SVG switches).
  const plan = planSessionUpdate(sessionFiles, sessionRoot, files, rootPath);
  if (plan.action === 'full') {
    await compiler.reset();
    overlayFiles = new Map();
  }

  try {
    for (const path of plan.changed) {
      addToVfs(compiler, path, files[path]);
    }
    sessionFiles = plan.nextFiles;
    sessionRoot = rootPath;
  } catch (err) {
    // VFS may be half-updated — never trust it for an incremental pass.
    invalidateCompileSession();
    throw err;
  }

  if (plan.action === 'incremental') {
    console.log(
      `[Typst Worker] VFS incremental update: ${plan.changed.length} file(s) re-added`,
    );
  }

  return { compiler, mainPath, rootPath };
}

function normalizeCompileRoot(root?: string): string {
  if (!root || root.trim() === '') return '/';
  const normalized = root.replace(/\\/g, '/');
  const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

async function compilePdf(
  files: Record<string, CompileFileContent>,
  mainFile: string,
  root?: string,
  knownPaths?: string[],
): Promise<{ pdf: Uint8Array; diagnostics: EditorDiagnostic[] }> {
  const { compiler, mainPath, rootPath } = await prepareCompile(
    files,
    mainFile,
    root,
    false,
    knownPaths,
  );

  const result = await compiler.compile({
    mainFilePath: mainPath,
    root: rootPath,
    format: 1, // PDF format
    diagnostics: 'unix',
  });

  const diagnostics = parseDiagnostics(result.diagnostics ?? []);

  if (!result.result) {
    const errorMessage =
      diagnostics.length > 0
        ? diagnostics.map((d) => d.message).join('\n')
        : 'Typst compilation failed with no diagnostic information';
    console.error(
      `[Typst Worker] PDF compile failed (root=${rootPath}, main=${mainPath}):`,
      errorMessage,
    );
    throw Object.assign(new Error(errorMessage), { parsedDiagnostics: diagnostics });
  }

  if (diagnostics.length > 0) {
    console.warn('[Typst Worker] PDF compile warnings:', diagnostics);
  }

  console.log(
    `[Typst Worker] PDF compile OK — bytes: ${result.result.byteLength}, ${diagnostics.length} diagnostics`,
  );

  return { pdf: result.result, diagnostics };
}

/** Compile to the vector artifact shared by both SVG paths (full render and
 * the incremental session). */
async function compileVector(
  files: Record<string, CompileFileContent>,
  mainFile: string,
  root?: string,
  overlay = false,
  knownPaths?: string[],
): Promise<{ artifact: Uint8Array; diagnostics: EditorDiagnostic[] }> {
  const { compiler, mainPath, rootPath } = await prepareCompile(
    files,
    mainFile,
    root,
    overlay,
    knownPaths,
  );

  const result = await compiler.compile({
    mainFilePath: mainPath,
    root: rootPath,
    format: 'vector', // Vector artifact, fed into the renderer.
    diagnostics: 'unix',
  });

  const diagnostics = parseDiagnostics(result.diagnostics ?? []);

  if (!result.result || result.result.byteLength === 0) {
    const errorMessage =
      diagnostics.length > 0
        ? diagnostics.map((d) => d.message).join('\n')
        : 'Typst vector compilation failed with no diagnostic information';
    console.error(
      `[Typst Worker] vector compile failed (root=${rootPath}, main=${mainPath}):`,
      errorMessage,
    );
    throw Object.assign(new Error(errorMessage), { parsedDiagnostics: diagnostics });
  }

  return { artifact: result.result, diagnostics };
}

async function compileSvg(
  files: Record<string, CompileFileContent>,
  mainFile: string,
  root?: string,
  overlay = false,
  knownPaths?: string[],
): Promise<{ svg: string; diagnostics: EditorDiagnostic[] }> {
  const { artifact, diagnostics } = await compileVector(
    files,
    mainFile,
    root,
    overlay,
    knownPaths,
  );

  const renderer = await getRenderer();
  const svg = await renderer.renderSvg({ artifactContent: artifact });

  if (diagnostics.length > 0) {
    console.warn('[Typst Worker] SVG compile warnings:', diagnostics);
  }

  console.log(
    `[Typst Worker] SVG compile OK — svg length: ${svg.length}, ${diagnostics.length} diagnostics`,
  );

  return { svg, diagnostics };
}

/**
 * "Incremental" SVG frame. The COMPILE is incremental (vector artifact via
 * comemo / IP-8); the RENDER is a plain full render from that artifact.
 *
 * We deliberately do NOT reuse a long-lived RenderSession across frames:
 * typst.ts frees the session when `runWithSession`'s callback returns and its
 * docs warn the leaked-lifetime pattern is "quite bug-prone". Holding it open
 * let a second `create_session` overlap a still-live session on the same
 * renderer and panic ("recursive use of an object … unsafe aliasing in rust"),
 * which poisoned the renderer so subsequent renders also failed. A full render
 * per frame is robust and cheap relative to compile (KC-C). `isFirstFrame` is
 * always true so the client replaces (not patches) the DOM.
 */
async function compileSvgIncrementalFrame(
  files: Record<string, CompileFileContent>,
  mainFile: string,
  root?: string,
  knownPaths?: string[],
): Promise<{ svg: string; isFirstFrame: boolean; diagnostics: EditorDiagnostic[] }> {
  const t0 = performance.now();
  const { artifact, diagnostics } = await compileVector(
    files,
    mainFile,
    root,
    false,
    knownPaths,
  );
  const renderer = await getRenderer();
  // KC-C measurement: split the frame cost into compile (vector) vs render.
  const tAfterCompile = performance.now();

  const svg = await renderer.renderSvg({ artifactContent: artifact });

  console.log(
    `[Typst Worker] SVG frame OK — ${svg.length} chars, ` +
      `vector=${artifact.byteLength}B, ` +
      `compile=${Math.round(tAfterCompile - t0)}ms render=${Math.round(performance.now() - tAfterCompile)}ms ` +
      `total=${Math.round(performance.now() - t0)}ms, ${diagnostics.length} diagnostics`,
  );

  return { svg, isFirstFrame: true, diagnostics };
}

// ============================================================================
// Heading Query (source-mapping support)
// ============================================================================

/**
 * Resolve every heading's RENDERED position (page + x/y in pt) plus its body
 * text, for the reverse-sync (click-to-source) pipeline.
 *
 * Why a metadata probe instead of `query({selector:'heading'})` directly:
 * typst.ts's `query('heading')` returns the element FIELDS only (level, body,
 * numbering, …) with NO resolved location — there is no page/x/y on the
 * serialized element (verified against @myriaddreamin/typst-ts 0.7.x; the
 * earlier `h.location?.page` read was always `undefined`, so the map came back
 * empty and reverse sync silently no-opped). A heading's position only exists
 * via the Typst-side `h.location().position()`. So we append an invisible,
 * labelled `#metadata` that runs `query(heading).map(...)` inside `#context`
 * and surfaces each heading's `{page, x, y, level, body}`, then read that one
 * metadata value back out.
 *
 * The probe is appended ONLY to this query compile, never the preview compile,
 * and `#metadata` renders nothing — so positions match the real document.
 */
const SYNC_PROBE_LABEL = '__tlu_sync_probe__';
const SYNC_PROBE_SNIPPET =
  `\n#context [#metadata(query(heading).map(h => (` +
  `page: h.location().page(), ` +
  `x: h.location().position().x.pt(), ` +
  `y: h.location().position().y.pt(), ` +
  `level: h.level, ` +
  `body: h.body)))<${SYNC_PROBE_LABEL}>]\n`;

async function queryHeadings(
  files: Record<string, CompileFileContent>,
  mainFile: string,
  root?: string,
): Promise<HeadingLocation[]> {
  // Append the metadata probe to the main file's source — for this query only.
  const mainContent = files[mainFile];
  if (typeof mainContent !== 'string') return [];
  const probedFiles: Record<string, CompileFileContent> = {
    ...files,
    [mainFile]: mainContent + SYNC_PROBE_SNIPPET,
  };

  const { compiler, mainPath, rootPath } = await prepareCompile(probedFiles, mainFile, root);

  // typst.ts's high-level `compiler.query()` snapshots a world but NEVER
  // compiles the paged document before querying (and double-JSON.parses) — so
  // it always throws "document is not compiled". Drive the world ourselves the
  // way the library intends: snapshot → compile paged doc → query. `world.query`
  // already returns parsed JSON.
  let raw: unknown;
  try {
    raw = await compiler.runWithWorld(
      { mainFilePath: mainPath, root: rootPath },
      async (world) => {
        await world.compile({ diagnostics: 'unix' });
        return world.query({ selector: `<${SYNC_PROBE_LABEL}>`, field: 'value' });
      },
    );
  } catch (err) {
    console.warn('[Typst Worker] sync heading probe failed:', err);
    return [];
  }

  // `field: 'value'` yields one entry per matching metadata element. There is
  // exactly one probe element whose value is the heading array → unwrap it.
  const list: unknown = Array.isArray(raw)
    ? Array.isArray(raw[0])
      ? raw[0]
      : raw
    : [];
  if (!Array.isArray(list)) return [];

  const out: HeadingLocation[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const h = item as {
      level?: number;
      body?: unknown;
      page?: number;
      x?: number | { value?: number };
      y?: number | { value?: number };
    };
    const page = typeof h.page === 'number' ? h.page : undefined;
    const xPt = numericPt(h.x);
    const yPt = numericPt(h.y);
    if (typeof page !== 'number' || xPt === null || yPt === null) continue;
    out.push({
      level: typeof h.level === 'number' ? h.level : 1,
      body: extractText(h.body),
      page,
      xPt,
      yPt,
    });
  }
  return out;
}

/** typst.ts may serialize lengths as either a raw number (pt) or `{value, unit}`. */
function numericPt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v === 'object' && 'value' in (v as Record<string, unknown>)) {
    const value = (v as { value?: number }).value;
    return typeof value === 'number' ? value : null;
  }
  return null;
}

/** Recursively extract text content from a Typst content tree fragment. */
function extractText(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object') {
    const n = node as { text?: string; body?: unknown; children?: unknown };
    if (typeof n.text === 'string') return n.text;
    if (n.body !== undefined) return extractText(n.body);
    if (n.children !== undefined) return extractText(n.children);
  }
  return '';
}

// ============================================================================
// Message Handler
// ============================================================================

ctx.onmessage = (event: MessageEvent<CompileRequest | QueryHeadingsRequest>) => {
  const message = event.data;
  if (!message) return;

  if (message.type === 'query-headings') {
    const req = message;
    compileQueue = compileQueue.then(async () => {
      try {
        const headings = await queryHeadings(req.files, req.mainFile, req.root);
        ctx.postMessage({
          type: 'query-headings-result',
          id: req.id,
          ok: true,
          headings,
        } satisfies QueryHeadingsResponse);
      } catch (error) {
        ctx.postMessage({
          type: 'query-headings-result',
          id: req.id,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        } satisfies QueryHeadingsResponse);
      }
    });
    return;
  }

  if (message.type !== 'compile') return;

  const format: CompileFormat = message.format ?? 'pdf';

  // Queue compilation to ensure sequential processing
  compileQueue = compileQueue.then(async () => {
    try {
      if (format === 'svg') {
        const { svg, diagnostics } = await compileSvg(
          message.files,
          message.mainFile,
          message.root,
          message.overlay ?? false,
          message.knownPaths,
        );
        ctx.postMessage({
          type: 'compile-result',
          id: message.id,
          ok: true,
          format: 'svg',
          svg,
          diagnostics,
        } satisfies CompileResponse);
        return;
      }

      if (format === 'svg-incremental') {
        // Incremental COMPILE (vector via comemo); full render per frame.
        const { svg, isFirstFrame, diagnostics } =
          await compileSvgIncrementalFrame(
            message.files,
            message.mainFile,
            message.root,
            message.knownPaths,
          );
        ctx.postMessage({
          type: 'compile-result',
          id: message.id,
          ok: true,
          format: 'svg-incremental',
          svg,
          isFirstFrame,
          diagnostics,
        } satisfies CompileResponse);
        return;
      }

      const { pdf, diagnostics } = await compilePdf(
        message.files,
        message.mainFile,
        message.root,
        message.knownPaths,
      );

      // Create a copy of the PDF data for transfer
      const pdfCopy = new Uint8Array(pdf.length);
      pdfCopy.set(pdf);

      ctx.postMessage(
        {
          type: 'compile-result',
          id: message.id,
          ok: true,
          format: 'pdf',
          pdf: pdfCopy.buffer,
          diagnostics,
        } satisfies CompileResponse,
        [pdfCopy.buffer], // Transfer ownership for performance
      );
    } catch (error) {
      // KC-B: a delta the worker couldn't apply asks the client to resync —
      // it's a control signal, not a compile failure. Don't surface it as a
      // diagnostic; the client retries with a full upload.
      if ((error as { needResync?: boolean })?.needResync) {
        ctx.postMessage({
          type: 'compile-result',
          id: message.id,
          ok: false,
          format,
          error: NEED_RESYNC,
          diagnostics: [],
        } satisfies CompileResponse);
        return;
      }

      let diagnostics: EditorDiagnostic[] = (error as any).parsedDiagnostics ?? [];

      if (diagnostics.length === 0 && error instanceof Error) {
        diagnostics = error.message
          .split('\n')
          .map(parseUnixDiagnosticLine)
          .filter((d): d is EditorDiagnostic => d !== null);
      }

      ctx.postMessage({
        type: 'compile-result',
        id: message.id,
        ok: false,
        format,
        error: error instanceof Error ? error.message : String(error),
        diagnostics,
      } satisfies CompileResponse);
    }
  });
};

// Log worker initialization
console.log('[Typst Worker] Worker initialized and ready');
