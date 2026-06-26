/**
 * Sync the Typst WASM binaries served at `/wasm/*` from the installed
 * `@myriaddreamin/*` packages into `public/wasm/`.
 *
 * Why: the editor worker (`src/app/editor/services/typstWorker.ts`) fetches the
 * web-compiler + renderer WASM from fixed URLs (`/wasm/typst_ts_*_bg.wasm`),
 * i.e. from `public/wasm/` — NOT bundled from node_modules. So the npm package
 * version and the vendored binary can silently drift apart (e.g. after a
 * version bump the JS glue is new but the WASM is stale), causing init failures
 * or subtle incompatibilities. Running this on predev/prebuild keeps them in
 * lockstep with whatever version is installed.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const PAIRS = [
  [
    'node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm',
    'public/wasm/typst_ts_web_compiler_bg.wasm',
  ],
  [
    'node_modules/@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm',
    'public/wasm/typst_ts_renderer_bg.wasm',
  ],
];

for (const [src, dest] of PAIRS) {
  if (!existsSync(src)) {
    console.error(`[sync-typst-wasm] missing source: ${src}\n  Run \`npm install\` first.`);
    process.exit(1);
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`[sync-typst-wasm] ${dest} ← ${src}`);
}
