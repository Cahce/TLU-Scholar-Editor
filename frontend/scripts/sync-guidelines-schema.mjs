#!/usr/bin/env node
// Sync the Prisma schema block inside guidelines/Guidelines.md from the canonical
// source of truth: backend/prisma/schema.prisma.
//
// - Idempotent: running it when nothing changed leaves the file untouched.
// - Steady state: replaces only the content between the AUTO-GENERATED markers.
// - First run / migration: removes the legacy unfenced schema dump and inserts a
//   clean fenced block with markers.
//
// Run manually:  npm run sync:guidelines-schema   (from Frontendtluscholareditor/)
// Also invoked by the Claude hook `prisma-schema-sync-guidelines` when the schema changes.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const SCHEMA_PATH = resolve(scriptDir, "../../backend/prisma/schema.prisma");
const GUIDE_PATH = resolve(scriptDir, "../guidelines/Guidelines.md");

const FENCE = "```";
const BEGIN =
  "<!-- BEGIN AUTO-GENERATED: prisma-schema (source: backend/prisma/schema.prisma) -->";
const END = "<!-- END AUTO-GENERATED: prisma-schema -->";
const HEADING =
  "Always refer to this database schema. The block below is auto-generated from " +
  "`backend/prisma/schema.prisma` — do not edit it by hand; run `npm run sync:guidelines-schema`.";

// Anchors that mark where the legacy (hand-pasted) schema dump begins, used only on first run.
const LEGACY_ANCHORS = ["Alway refer this database:", "// This is your Prisma schema file,"];

function rtrim(s) {
  return s.replace(/\s+$/, "");
}

async function main() {
  const schema = (await readFile(SCHEMA_PATH, "utf8")).replace(/\r\n/g, "\n").trim();

  const raw = await readFile(GUIDE_PATH, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const guide = raw.replace(/\r\n/g, "\n");

  const fenced = `${BEGIN}\n${FENCE}prisma\n${schema}\n${FENCE}\n${END}`;

  const beginIdx = guide.indexOf(BEGIN);
  const endIdx = guide.indexOf(END);

  let nextLf;
  if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
    // Steady state: swap only the marked region, keep surrounding prose intact.
    nextLf = guide.slice(0, beginIdx) + fenced + guide.slice(endIdx + END.length);
  } else {
    // First run: drop the legacy dump (assumed to run to EOF) and append a clean block.
    let cut = -1;
    for (const anchor of LEGACY_ANCHORS) {
      const i = guide.indexOf(anchor);
      if (i !== -1) {
        cut = i;
        break;
      }
    }
    const head = cut === -1 ? rtrim(guide) : rtrim(guide.slice(0, cut));
    nextLf = `${head}\n\n${HEADING}\n\n${fenced}`;
  }

  nextLf = rtrim(nextLf) + "\n";
  const nextOut = eol === "\r\n" ? nextLf.replace(/\n/g, "\r\n") : nextLf;

  if (nextOut === raw) {
    console.log("[sync:guidelines-schema] Guidelines.md already up to date.");
    return;
  }

  await writeFile(GUIDE_PATH, nextOut, "utf8");
  console.log(
    `[sync:guidelines-schema] Updated ${relative(repoRoot, GUIDE_PATH)} ` +
      `from ${relative(repoRoot, SCHEMA_PATH)} (${schema.split("\n").length} schema lines).`,
  );
}

main().catch((err) => {
  console.error("[sync:guidelines-schema] FAILED:", err.message);
  process.exit(1);
});
