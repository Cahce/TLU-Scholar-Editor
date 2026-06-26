/**
 * Static Typst stdlib data loader.
 *
 * Eagerly imports `data/typst-stdlib.json` (small ~50 KB) so handler code
 * can be synchronous. We index by function name and (function, param) so
 * lookups stay O(1) inside completion sources that run on every keystroke.
 */

import rawData from "./data/typst-stdlib.json" with { type: "json" };
import type { TypstStdlib, TypstFunction, TypstParam } from "./types";

export const stdlib: TypstStdlib = rawData as TypstStdlib;

const functionByName = new Map<string, TypstFunction>(
  stdlib.functions.map((fn) => [fn.name, fn]),
);

export function getFunction(name: string): TypstFunction | undefined {
  return functionByName.get(name);
}

export function getParam(
  funcName: string,
  paramName: string,
): TypstParam | undefined {
  return getFunction(funcName)?.params.find((p) => p.name === paramName);
}

/**
 * Functions whose first positional string argument is a file path.
 * Vendored from `references/tinymist/.../analysis/completion/path.rs`.
 */
const FILE_PATH_FUNCTIONS = new Map<string, string[]>([
  ["image", ["png", "jpg", "jpeg", "gif", "webp", "svg"]],
  ["include", ["typ"]],
  ["import", ["typ"]],
  ["read", []], // any text file
  ["csv", ["csv", "tsv"]],
  ["json", ["json"]],
  ["yaml", ["yml", "yaml"]],
  ["toml", ["toml"]],
  ["bibliography", ["bib", "yml", "yaml"]],
]);

export function isFilePathFunction(name: string): boolean {
  return FILE_PATH_FUNCTIONS.has(name);
}

export function filePathExtensions(name: string): string[] {
  return FILE_PATH_FUNCTIONS.get(name) ?? [];
}
