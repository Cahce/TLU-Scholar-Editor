import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

// Installed Typst renderer version — injected into the editor worker to
// cache-bust the vendored `/wasm/*.wasm` URLs on upgrade (see typstWorker.ts).
// The web-compiler + renderer are always bumped together, so one version
// stamp is enough.
function readTypstWasmVersion(): string {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, 'node_modules/@myriaddreamin/typst-ts-renderer/package.json'),
        'utf8',
      ),
    ) as { version?: string }
    return pkg.version ?? 'dev'
  } catch {
    return 'dev'
  }
}

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

// ---------------------------------------------------------------------------
// codemirror-lang-typst v0.4.0 ships typst_syntax_bg.wasm whose Rust code
// panics ("RuntimeError: unreachable") inside TypstWasmParser.edit on certain
// edits. The error propagates through CodeMirror's StateField.update and
// crashes the React tree. We can't fix the WASM, so we wrap the call in a
// try-catch and fall back to a full re-parse — the same path the library
// already takes when edits.full_update is true.
//
// The patch needs to run in TWO places:
//   1. esbuild pre-bundling (dev mode) via optimizeDeps.esbuildOptions.plugins
//      — this keeps codemirror-lang-typst inside the pre-bundle so all CM
//        modules share one @codemirror/state instance (otherwise instanceof
//        checks across copies fail with "Unrecognized extension value").
//   2. Rollup transform (production build) via plugins.transform
//      — Rollup processes node_modules sources directly during build.
// ---------------------------------------------------------------------------
const TYPST_EDIT_CALL =
  `let edits = (_a = parser.parser) === null || _a === void 0 ? void 0 : _a.edit(fromA, toA, inserted.toString());`
const TYPST_EDIT_CALL_PATCHED =
  `let edits; try { edits = (_a = parser.parser) === null || _a === void 0 ? void 0 : _a.edit(fromA, toA, inserted.toString()); } catch (_wasmErr) { console.warn('[codemirror-lang-typst] WASM error, forcing full re-parse:', _wasmErr); edits = { full_update: true, edits: [] }; }`
const TYPST_FULL_UPDATE_CHECK = `if (edits.full_update) {`
const TYPST_FULL_UPDATE_CHECK_PATCHED = `if (!edits || edits.full_update) {`

function patchTypstSource(code: string): string | null {
  if (!code.includes(TYPST_EDIT_CALL)) return null
  return code
    .replace(TYPST_EDIT_CALL, TYPST_EDIT_CALL_PATCHED)
    .replace(TYPST_FULL_UPDATE_CHECK, TYPST_FULL_UPDATE_CHECK_PATCHED)
}

// Vite/Rollup plugin — runs during production build (`vite build`).
function patchCodemirrorLangTypstRollup() {
  return {
    name: 'patch-codemirror-lang-typst-rollup',
    transform(code: string, id: string) {
      if (!id.includes('codemirror-lang-typst')) return null
      return patchTypstSource(code)
    },
  }
}

// esbuild plugin — runs during dev-mode pre-bundling so the patch is applied
// without removing the package from optimizeDeps (which would duplicate
// @codemirror/state).
const patchCodemirrorLangTypstEsbuild = {
  name: 'patch-codemirror-lang-typst-esbuild',
  setup(build: any) {
    build.onLoad(
      { filter: /codemirror-lang-typst[\\/]dist[\\/]index\.js$/ },
      async (args: { path: string }) => {
        const original = await fs.promises.readFile(args.path, 'utf8')
        const patched = patchTypstSource(original)
        return { contents: patched ?? original, loader: 'js' }
      },
    )
  },
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // Patch codemirror-lang-typst for production builds (Rollup pass).
    patchCodemirrorLangTypstRollup(),
    // WASM support for codemirror-lang-typst and Typst compiler
    wasm(),
    topLevelAwait(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  // Inject the installed Typst WASM version so the worker can cache-bust the
  // vendored binaries on upgrade (prevents stale-WASM / wasm-bindgen ABI skew).
  define: {
    __TYPST_WASM_VERSION__: JSON.stringify(readTypstWasmVersion()),
  },

  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // Worker configuration for Typst WASM compiler
  worker: {
    format: 'es',
  },

  // -------------------------------------------------------------------------
  // Code-split heavy vendor dependencies into named chunks. Keeps the main
  // bundle small enough to load fast on first visit and lets browsers cache
  // vendor bundles independently of app-code deploys. Buckets chosen so each
  // is < ~250 KB gzipped — well under Vite's 500 KB warning threshold.
  // -------------------------------------------------------------------------
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/]react(?:-dom|-router)?[\\/]/.test(id)) return 'react-vendor'
          if (id.includes('@radix-ui/')) return 'radix-ui'
          if (
            id.includes('@codemirror/') ||
            id.includes('@uiw/react-codemirror') ||
            id.includes('codemirror-lang-typst') ||
            id.includes('@lezer/')
          ) {
            return 'codemirror'
          }
          if (id.includes('react-pdf') || id.includes('pdfjs-dist')) {
            return 'pdf-viewer'
          }
          if (id.includes('@myriaddreamin/')) return 'typst-compiler'
          if (id.includes('@mui/') || id.includes('@emotion/')) return 'mui-admin'
          if (id.includes('recharts') || id.includes('d3-')) return 'charts'
          return undefined
        },
      },
    },
  },

  // Exclude WASM packages from optimization. codemirror-lang-typst stays IN
  // the pre-bundle so @codemirror/state has a single instance — but we patch
  // it via esbuild's onLoad hook below.
  optimizeDeps: {
    exclude: [
      '@myriaddreamin/typst-ts-web-compiler',
      '@myriaddreamin/typst-ts-renderer',
    ],
    esbuildOptions: {
      plugins: [patchCodemirrorLangTypstEsbuild],
    },
  },
})
