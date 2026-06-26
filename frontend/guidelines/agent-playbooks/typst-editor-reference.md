# Typst Editor Reference Notes

Created for Phase 5+ work on the TLU Scholar Editor frontend.

This note summarizes what to reuse from:

- `references/typst-online-editor/src/lib/typst/`
- `references/texlyre/`

The goal is not to copy either app. Use their compiler, worker, renderer, and editor patterns as reference material, then implement the local editor in the existing `src/app/editor/*` architecture.

## Current Local State

- Diagnostics UI is already wired:
  - `src/app/editor/types/diagnostics.ts`
  - `src/app/editor/services/diagnosticMap.ts`
  - `src/app/editor/hooks/useEditorLinter.ts`
  - `src/app/editor/components/IssuesPanel.tsx`
  - `src/app/editor/components/EditorToolbar.tsx`
- `PreviewPane.tsx` is still a stub.
- `public/wasm/` already has:
  - `typst_ts_web_compiler_bg.wasm`
  - `typst_ts_renderer_bg.wasm`
- `public/fonts/` is currently missing. For stable offline Typst preview, copy a small starter set from `references/typst-online-editor/public/fonts/` or `references/texlyre/public/assets/fonts/`.
- Vite already has worker format and WASM package exclusions in `vite.config.ts`.

## Reference: typst-online-editor

Important files:

- `references/typst-online-editor/src/lib/typst/typst.worker.ts`
- `references/typst-online-editor/src/lib/typst/typstClient.ts`
- `references/typst-online-editor/src/lib/typst/TypstCompilerService.ts`
- `references/typst-online-editor/src/lib/typst/examples/TypstExamples.ts`

Useful patterns:

- Keeps Typst compilation off the UI thread with a module worker.
- Uses `createTypstCompiler`, `loadFonts`, `MemoryAccessModel`, `FetchPackageRegistry`, `withAccessModel`, and `withPackageRegistry`.
- Sends requests with an `id`, tracks pending responses in a `Map`, and resolves only the matching promise.
- Transfers PDF output as an `ArrayBuffer` instead of copying large data through structured clone.
- Splits text sources from binary files. Text files use `addSource`, while images and fonts use `mapShadow`.
- Uses a compile sequence in the service layer so stale results do not replace newer preview output.
- Lazily upgrades the compiler when emoji, CJK, or custom font files are needed.
- Revokes old blob URLs when replacing preview PDFs.

Things to change before using it locally:

- Replace `process.env.NEXT_PUBLIC_BASE_PATH` with Vite-friendly URL handling. Prefer `import.meta.env.BASE_URL` on the main thread, and in workers build asset URLs with `new URL('/wasm/typst_ts_web_compiler_bg.wasm', self.location.origin)`.
- Prefer structured diagnostics via `diagnostics: 'full'` when feeding the local Issues panel. `diagnostics: 'unix'` is useful for logs but weaker for inline ranges.
- Add `compiler.resetShadow()` before each compile. If deleted source files can remain visible to the compiler, consider recreating the compiler or calling `reset()` when the project file path set changes.
- Return diagnostics on both success and failure. A successful Typst compile can still produce warnings.

Recommended local shape:

- `src/app/editor/preview/typst.worker.ts`
- `src/app/editor/preview/typstClient.ts`
- `src/app/editor/preview/diagnostics.ts`
- `src/app/editor/hooks/useTypstPreview.ts`
- Update `src/app/editor/components/PreviewPane.tsx`

## Reference: texlyre Typst Compile Layer

Important files:

- `references/texlyre/src/extensions/typst.ts/typst-worker.ts`
- `references/texlyre/src/extensions/typst.ts/TypstCompilerEngine.ts`
- `references/texlyre/src/services/TypstService.ts`
- `references/texlyre/src/contexts/TypstContext.tsx`
- `references/texlyre/src/types/typst.ts`

Useful patterns:

- Separates responsibilities:
  - Worker owns WASM compiler/renderer initialization and compile calls.
  - Engine owns request IDs, pending promises, worker errors, abort behavior, and terminate.
  - Service owns source preparation, status, notifications, output persistence, and export.
  - React context/hook owns UI state.
- Supports `pdf`, `svg`, `canvas`, and `canvas-pdf`, but the local MVP should start with PDF preview only.
- Warms the worker with `ping()` so the first visible compile is less surprising.
- Uses `AbortController` to cancel compile work by terminating the worker.
- Adds PDF options with `setPdfOptsForNextCompile`.
- Normalizes paths by removing leading slashes before sending, then worker adds the leading slash for Typst.
- Stores compile outputs/logs separately from source files.

Things to simplify locally:

- Do not bring over Texlyre's plugin registry, notification service, storage model, or global context.
- Use the existing Zustand editor store instead of adding a new React context.
- Keep preview compile ephemeral. Server export remains a later phase.
- Start with one active preview PDF URL and diagnostics in the existing store.

## Reference: texlyre PDF Renderers

Important files:

- `references/texlyre/extras/renderers/pdf/PdfRenderer.tsx`
- `references/texlyre/extras/renderers/canvas/CanvasRenderer.tsx`
- `references/texlyre/extras/renderers/canvas/pdfRenderer.ts`
- `references/texlyre/extras/renderers/canvas/svgRenderer.ts`

Useful patterns:

- `pdfjs-dist` worker setup:
  - `pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()`
- Copy incoming `ArrayBuffer` into a fresh `Uint8Array` before rendering to avoid detached buffer issues.
- Track:
  - page count
  - current page
  - scale
  - loading/error state
  - scroll view vs single page view
- Render only visible pages in scroll mode with a small page buffer.
- Keep page size metadata to compute fit-width and fit-height zoom.
- Use a stable toolbar with previous/next page, page input, zoom, fit, scroll/single page, fullscreen, and download.

Local MVP recommendation:

- Use `pdfjs-dist` directly or `react-pdf` if already desired. Since `pdfjs-dist` is already installed, direct `pdfjs-dist` keeps dependencies smaller.
- Start with:
  - one scroll container
  - first-page render
  - page count
  - zoom in/out
  - fit width
  - loading and compile error states
- Add virtualized multi-page scroll after preview compile is stable.

## Reference: texlyre CodeMirror Features

Important files:

- `references/texlyre/src/hooks/editor/useEditorView.ts`
- `references/texlyre/src/extensions/codemirror/PathAndBibAutocompleteExtension.ts`
- `references/texlyre/src/extensions/codemirror/autocomplete/patterns.ts`
- `references/texlyre/src/extensions/codemirror/linkNavigation/LinkDetector.ts`
- `references/texlyre/src/extensions/codemirror/linkNavigation/LinkNavigator.ts`
- `references/texlyre/src/utils/typstOutlineParser.ts`

Good later-phase ideas:

- Typst path autocomplete for:
  - `#include "..."`
  - `image("...")`
  - `read("...")`
  - `csv("...")`
  - `json("...")`
  - `yaml("...")`
  - `toml("...")`
  - `#bibliography("...")`
- Typst reference/citation completion for `@label` and `#ref(<label>)`.
- Ctrl/Cmd-click navigation for files, URLs, bibliography entries, and labels.
- Typst outline parser based on heading prefixes:
  - `= `
  - `== `
  - `=== `
  - `==== `
  - `===== `

Local guidance:

- Build these as separate CodeMirror extensions under `src/app/editor/extensions/*` later.
- Do not copy Texlyre CSS. Match local Tailwind/shadcn styling and the current editor theme.
- Prefer store selectors and local services over document-wide custom events when the target is in React state. Events are fine for CodeMirror imperative jumps.

## T5.2 Preview Worker Blueprint

Worker request contract:

```ts
type TypstCompileRequest = {
  type: "compile";
  id: string;
  mainPath: string;
  files: Record<string, string>;
  assets?: Record<string, Uint8Array>;
};
```

Worker response contract:

```ts
type TypstCompileResponse =
  | {
      type: "compile-result";
      id: string;
      ok: true;
      pdf: ArrayBuffer;
      diagnostics: EditorDiagnostic[];
    }
  | {
      type: "compile-result";
      id: string;
      ok: false;
      error: string;
      diagnostics: EditorDiagnostic[];
    };
```

Worker initialization:

- Create compiler lazily on first compile.
- Load local WASM from `/wasm/typst_ts_web_compiler_bg.wasm`.
- Load core fonts from `/fonts/...`.
- Add package registry support with `MemoryAccessModel` and `FetchPackageRegistry`.
- Use `loadFonts(fontUrls, { assets: ['text'] })` if core fonts are present.
- Add sources with normalized absolute paths:
  - `main.typ` becomes `/main.typ`
  - `chapters/a.typ` becomes `/chapters/a.typ`
- Map binary assets with `mapShadow`.
- Compile with `format: CompileFormatEnum.pdf` or numeric `1`.
- Use `diagnostics: 'full'` and map Typst diagnostics to `EditorDiagnostic[]`.
- Transfer the PDF buffer with `postMessage(response, [buffer])`.

Client wrapper:

- Create one worker instance per preview hook lifecycle.
- Keep pending promises by request `id`.
- On dispose, terminate worker and reject pending promises.
- Ignore stale responses with a sequence counter in the hook.

## Diagnostic Mapping

The local UI expects this shape:

```ts
interface EditorDiagnostic {
  source: "client" | "server";
  severity: "error" | "warning" | "hint" | "info";
  message: string;
  file?: string;
  range?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  hints?: string[];
}
```

When `diagnostics: 'full'`, Typst diagnostics are shaped roughly like:

```ts
{
  package: string;
  path: string;
  severity: string;
  range: "2:9-3:15";
  message: string;
}
```

Mapping rules:

- `path` should remove a leading slash before storing in `file`.
- `range` string should parse as `startLine:startColumn-endLine:endColumn`.
- If the end side has only a column, default the end line to start line.
- If a diagnostic has no path/range, keep it for the Issues panel but it will not draw inline.
- Mark client preview diagnostics as `source: "client"`.
- If the worker throws a plain error, create one diagnostic with no range and `file: mainPath`.

## T5.3 Hook and PreviewPane Blueprint

`useTypstPreview` responsibilities:

- Select from `useEditorStore`:
  - `projectId`
  - `settings.mainPath`
  - `files`
  - `drafts`
  - `previewPath`
  - `setDiagnostics`
- Build compile inputs from the project:
  - Use draft content when a draft exists.
  - Fall back to `file.textContent`.
  - Include `.typ`, `.bib`, `.json`, `.yaml`, `.yml`, `.toml`, `.csv`, `.txt`.
  - For image/font assets, the current API shape needs a binary/base64 source before client preview can include them.
- Debounce content changes by 750ms.
- Do not compile if the main file is missing or empty.
- Maintain local preview state:
  - `status: "idle" | "compiling" | "success" | "error"`
  - `pdfData?: Uint8Array`
  - `pdfUrl?: string`
  - `error?: string`
  - `compiledAt?: string`
- Revoke old `pdfUrl` on replacement and unmount.
- Push diagnostics into `useEditorStore.setDiagnostics`.
- Ignore stale compile results by sequence id.

`PreviewPane` responsibilities:

- Consume `useTypstPreview`.
- Show compact Vietnamese states:
  - missing main file
  - compiling
  - compile failed
  - no preview yet
- Render PDF with `pdfjs-dist`.
- Include basic controls:
  - previous/next page
  - page number
  - zoom out/in
  - fit width
  - download
- Keep layout dense and editor-like, not a marketing page.

## Binary Assets Gap

Client preview can compile pure text projects now, but images/fonts need one of these:

- API returns binary file content as base64/data URL in `ProjectFile`.
- Add an endpoint like `/projects/:id/files/:path/raw` returning `ArrayBuffer`.
- Store uploaded assets in IndexedDB for current project and read them during preview.

Until this is solved, the preview worker should compile text-only projects and surface a clear diagnostic when a referenced image/font cannot be read.

## Recommended Implementation Order

1. Add `public/fonts/` starter fonts.
2. Add `src/app/editor/preview/diagnostics.ts`.
3. Add `src/app/editor/preview/typst.worker.ts`.
4. Add `src/app/editor/preview/typstClient.ts`.
5. Add `src/app/editor/hooks/useTypstPreview.ts`.
6. Replace `PreviewPane.tsx` stub with PDF preview.
7. Run `npm run build`.
8. Test a minimal `main.typ`, a syntax error, a multi-file include, and a package import.

## Pitfalls To Avoid

- Do not run Typst compile on the main thread.
- Do not let stale compile results replace newer PDFs.
- Do not forget `URL.revokeObjectURL`.
- Do not rely only on string logs for diagnostics if structured diagnostics are available.
- Do not copy Texlyre's app-wide plugin system into this repo.
- Do not copy Texlyre or typst-online-editor UI/CSS directly.
- Do not assume images/fonts work until the frontend has a binary asset source.
- Do not use `process.env` in Vite browser code.
