/**
 * Trích manifest snapshot TỪ REGISTRY (một nguồn sự thật) cho bộ tra cứu.
 *
 * Dùng esbuild bundle `reference/categories.ts` (dữ liệu thuần, không kéo
 * helpContent/topics) → ESM tạm → import → gom mọi `paramExamples` (của fn và
 * members) có `snapshotId` → ghi `backend/scripts/reference-snapshots.manifest.json`.
 *
 * Chạy:  cd Frontendtluscholareditor && node scripts/extract-snapshot-manifest.mjs
 */
import { build } from "esbuild";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const entry = resolve(here, "../src/app/features/help/reference/categories.ts");
const tmp = resolve(here, ".tmp-reference-categories.mjs");
const outManifest = resolve(here, "../../backend/scripts/reference-snapshots.manifest.json");

const res = await build({
  entryPoints: [entry],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  // Để node tự resolve từ node_modules của frontend (file tạm nằm trong scripts/).
  external: ["lucide-react", "react", "react/jsx-runtime", "react-dom"],
});
writeFileSync(tmp, res.outputFiles[0].text, "utf-8");

let categories;
try {
  ({ ALL_CATEGORIES: categories } = await import(pathToFileURL(tmp).href));
} finally {
  try {
    unlinkSync(tmp);
  } catch {
    /* ignore */
  }
}

const seen = new Map();
let dup = 0;
const collect = (examples) => {
  for (const ex of examples ?? []) {
    if (!ex?.snapshotId || !ex.code) continue;
    if (seen.has(ex.snapshotId)) {
      dup++;
      console.warn(`[trùng id] ${ex.snapshotId} — bỏ qua bản sau.`);
      continue;
    }
    seen.set(ex.snapshotId, { id: ex.snapshotId, code: ex.code, width: ex.width ?? "auto" });
  }
};

for (const cat of categories) {
  for (const fn of cat.fns) {
    collect(fn.paramExamples);
    for (const m of fn.members ?? []) collect(m.paramExamples);
  }
}

const manifest = [...seen.values()];
mkdirSync(dirname(outManifest), { recursive: true });
writeFileSync(outManifest, JSON.stringify(manifest, null, 2), "utf-8");
console.log(`Manifest: ${manifest.length} ví dụ có snapshot${dup ? `, ${dup} id trùng` : ""} → ${outManifest}`);
