import type { ProjectFile, FileTreeNode } from "../types/editor";
import type {
  EditorDiagnostic,
  DiagnosticSeverity,
  DiagnosticRange,
} from "../types/diagnostics";

/**
 * Folder placeholder filename. Folders aren't first-class entities in the
 * backend model (only files are), so the UI creates a sentinel file at
 * `<folder>/.keep` to materialise an otherwise-empty folder. The placeholder
 * is hidden from the tree — users only see the folder it represents.
 *
 * Same pattern as `.gitkeep` in git repositories.
 */
const FOLDER_PLACEHOLDER_NAME = ".keep";

/**
 * Build file tree from flat file list.
 *   - Folders sorted first, files second; both alphabetical within their group.
 *   - `.keep` placeholder files are skipped from the tree view but their
 *     parent folder is still materialised (so an "empty" folder remains
 *     visible to the user).
 */
export function selectFileTree(
  files: Record<string, ProjectFile>,
): FileTreeNode[] {
  const tree: FileTreeNode[] = [];
  const folderMap = new Map<string, FileTreeNode>();

  // Sort paths to ensure parent folders are processed before children
  const sortedPaths = Object.keys(files).sort();

  for (const path of sortedPaths) {
    const file = files[path];
    const segments = path.split("/");
    const fileName = segments[segments.length - 1];
    const isPlaceholder = fileName === FOLDER_PLACEHOLDER_NAME;

    // Build folder hierarchy
    let currentPath = "";
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;

      if (!folderMap.has(currentPath)) {
        const folderNode: FileTreeNode = {
          path: currentPath,
          name: segment,
          kind: "folder",
          children: [],
        };
        folderMap.set(currentPath, folderNode);

        if (parentPath) {
          const parent = folderMap.get(parentPath);
          parent?.children?.push(folderNode);
        } else {
          tree.push(folderNode);
        }
      }
    }

    // Skip the file node for placeholders — folder hierarchy was already built
    // above, so the folder still appears even though its `.keep` is invisible.
    if (isPlaceholder) {
      continue;
    }

    // Add file node
    const fileNode: FileTreeNode = {
      path,
      name: fileName,
      kind: file.kind,
    };

    if (segments.length === 1) {
      // Root level file
      tree.push(fileNode);
    } else {
      // File in folder
      const parentPath = segments.slice(0, -1).join("/");
      const parent = folderMap.get(parentPath);
      parent?.children?.push(fileNode);
    }
  }

  // Sort each level: folders first, then files, both alphabetically
  function sortNodes(nodes: FileTreeNode[]): void {
    nodes.sort((a, b) => {
      if (a.kind === "folder" && b.kind !== "folder") return -1;
      if (a.kind !== "folder" && b.kind === "folder") return 1;
      return a.name.localeCompare(b.name);
    });

    for (const node of nodes) {
      if (node.children) {
        sortNodes(node.children);
      }
    }
  }

  sortNodes(tree);
  return tree;
}

/**
 * Flatten the visible portion of the tree into a depth-first ordered list
 * of paths, skipping children of collapsed folders. Used to compute
 * Shift+click selection ranges in the file panel — the range spans every
 * row the user can SEE between anchor and target, not every row that
 * exists in the project.
 */
export function flattenVisibleTree(
  tree: FileTreeNode[],
  expandedFolders: ReadonlySet<string>,
): string[] {
  const out: string[] = [];
  const walk = (nodes: FileTreeNode[]): void => {
    for (const node of nodes) {
      out.push(node.path);
      if (
        node.kind === "folder" &&
        node.children &&
        expandedFolders.has(node.path)
      ) {
        walk(node.children);
      }
    }
  };
  walk(tree);
  return out;
}

// ============================================================================
// Diagnostics selectors (cross-file error navigation)
//
// Derivations from the store's `diagnostics: EditorDiagnostic[]`. They power
// the global error indicator, per-file badges, and next/previous-issue
// navigation. `getDiagnosticSummary` is memoized on the diagnostics ARRAY
// REFERENCE (WeakMap): `setDiagnostics` always installs a fresh array per
// compile, so the cache stays valid between renders and recomputes only when
// diagnostics actually change — no flicker, no per-component useMemo needed.
// ============================================================================

/** Badge tier for a file. `info` folds into `hint` (matches IssuesPanel). */
export type FileSeverity = "error" | "warning" | "hint";

/** A navigable diagnostic — guaranteed to have both a file and a range. */
export interface IssueLocation {
  file: string;
  range: DiagnosticRange;
  severity: DiagnosticSeverity;
  message: string;
}

export interface DiagnosticSummary {
  /** Diagnostics grouped by file (files only; file-less diagnostics excluded). */
  byFile: Map<string, EditorDiagnostic[]>;
  /** Highest-severity badge tier per file. */
  severityByFile: Map<string, FileSeverity>;
  errorCount: number;
  warningCount: number;
  /** hint + info combined. */
  hintCount: number;
  /** Total diagnostics (including file-less / range-less ones). */
  total: number;
  /**
   * Navigable issues (file && range), sorted: severity class (error → warning →
   * hint) then file path then start line then start column. Drives next/prev.
   */
  orderedIssues: IssueLocation[];
  /** First navigable error in `orderedIssues`, or null. */
  firstErrorLocation: IssueLocation | null;
}

const SEVERITY_RANK: Record<DiagnosticSeverity, number> = {
  error: 3,
  warning: 2,
  hint: 1,
  info: 1,
};

function toFileSeverity(severity: DiagnosticSeverity): FileSeverity {
  if (severity === "error") return "error";
  if (severity === "warning") return "warning";
  return "hint"; // hint + info collapse to the lowest badge tier
}

const summaryCache = new WeakMap<EditorDiagnostic[], DiagnosticSummary>();

/**
 * Memoized diagnostics summary. Returns the SAME object for the same input
 * array reference, so subscribers don't re-render when diagnostics are
 * unchanged.
 */
export function getDiagnosticSummary(
  diagnostics: EditorDiagnostic[],
): DiagnosticSummary {
  const cached = summaryCache.get(diagnostics);
  if (cached) return cached;
  const summary = computeDiagnosticSummary(diagnostics);
  summaryCache.set(diagnostics, summary);
  return summary;
}

function computeDiagnosticSummary(
  diagnostics: EditorDiagnostic[],
): DiagnosticSummary {
  const byFile = new Map<string, EditorDiagnostic[]>();
  const severityByFile = new Map<string, FileSeverity>();
  let errorCount = 0;
  let warningCount = 0;
  let hintCount = 0;
  const navigable: IssueLocation[] = [];

  for (const d of diagnostics) {
    if (d.severity === "error") errorCount += 1;
    else if (d.severity === "warning") warningCount += 1;
    else hintCount += 1; // hint + info

    if (!d.file) continue;

    const list = byFile.get(d.file);
    if (list) list.push(d);
    else byFile.set(d.file, [d]);

    const tier = toFileSeverity(d.severity);
    const prev = severityByFile.get(d.file);
    if (!prev || SEVERITY_RANK[tier] > SEVERITY_RANK[prev]) {
      severityByFile.set(d.file, tier);
    }

    if (d.range) {
      navigable.push({
        file: d.file,
        range: d.range,
        severity: d.severity,
        message: d.message,
      });
    }
  }

  navigable.sort((a, b) => {
    const bySeverity = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (bySeverity !== 0) return bySeverity; // errors first
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.range.start.line !== b.range.start.line) {
      return a.range.start.line - b.range.start.line;
    }
    return a.range.start.column - b.range.start.column;
  });

  return {
    byFile,
    severityByFile,
    errorCount,
    warningCount,
    hintCount,
    total: diagnostics.length,
    orderedIssues: navigable,
    firstErrorLocation: navigable.find((i) => i.severity === "error") ?? null,
  };
}
