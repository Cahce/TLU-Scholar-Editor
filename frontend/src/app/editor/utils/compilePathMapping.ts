import type { EditorDiagnostic } from "../types/diagnostics";

export type CompileFileContent = string | Uint8Array;

export interface CompilePathMapping {
  files: Record<string, CompileFileContent>;
  mainFile: string;
  root: string;
  diagnosticPathMap: Record<string, string>;
  appliedRootPrefix: string | null;
}

function normalizeProjectPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\/+/, "");
}

function isTypstSource(filePath: string): boolean {
  return filePath.toLowerCase().endsWith(".typ");
}

function hasTypstProjectMarker(paths: string[]): boolean {
  const pathSet = new Set(paths);
  if (pathSet.has("project.toml")) return true;
  if (pathSet.has("typst.toml")) return true;
  if (pathSet.has("main.typ")) return true;
  return paths.filter(isTypstSource).length === 1;
}

function detectRebasePrefix(paths: string[], mainFile: string): string | null {
  if (!mainFile.includes("/")) return null;
  if (paths.length === 0) return null;

  const segments = paths.map((filePath) => filePath.split("/"));
  if (!segments.every((parts) => parts.length > 1)) return null;

  const roots = new Set(segments.map((parts) => parts[0]));
  if (roots.size !== 1) return null;

  const [commonRoot] = Array.from(roots);
  if (!mainFile.startsWith(`${commonRoot}/`)) return null;

  const strippedPaths = paths.map((filePath) => filePath.slice(commonRoot.length + 1));
  if (!hasTypstProjectMarker(strippedPaths)) return null;

  const uniqueStripped = new Set(strippedPaths);
  if (uniqueStripped.size !== strippedPaths.length) return null;

  return commonRoot;
}

export function createCompilePathMapping(
  files: Record<string, CompileFileContent>,
  mainFile: string,
): CompilePathMapping {
  const normalizedEntries = Object.entries(files).map(([filePath, content]) => ({
    storedPath: normalizeProjectPath(filePath),
    content,
  }));
  const normalizedMain = normalizeProjectPath(mainFile);
  const paths = normalizedEntries.map((entry) => entry.storedPath);
  const rebasePrefix = detectRebasePrefix(paths, normalizedMain);

  const mappedFiles: Record<string, CompileFileContent> = {};
  const diagnosticPathMap: Record<string, string> = {};

  for (const entry of normalizedEntries) {
    const compilePath = rebasePrefix
      ? entry.storedPath.slice(rebasePrefix.length + 1)
      : entry.storedPath;
    mappedFiles[compilePath] = entry.content;
    diagnosticPathMap[compilePath] = entry.storedPath;
  }

  const mappedMainFile = rebasePrefix
    ? normalizedMain.slice(rebasePrefix.length + 1)
    : normalizedMain;

  return {
    files: mappedFiles,
    mainFile: mappedMainFile,
    root: "/",
    diagnosticPathMap,
    appliedRootPrefix: rebasePrefix,
  };
}

export function restoreDiagnosticPath(
  diagnostic: EditorDiagnostic,
  diagnosticPathMap: Record<string, string> | null | undefined,
): EditorDiagnostic {
  if (!diagnostic.file || !diagnosticPathMap) return diagnostic;

  const normalizedFile = normalizeProjectPath(diagnostic.file);
  const restoredPath = diagnosticPathMap[normalizedFile];
  if (!restoredPath || restoredPath === diagnostic.file) return diagnostic;

  return {
    ...diagnostic,
    file: restoredPath,
  };
}

export function restoreDiagnosticPaths(
  diagnostics: EditorDiagnostic[],
  diagnosticPathMap: Record<string, string> | null | undefined,
): EditorDiagnostic[] {
  return diagnostics.map((diagnostic) =>
    restoreDiagnosticPath(diagnostic, diagnosticPathMap),
  );
}
