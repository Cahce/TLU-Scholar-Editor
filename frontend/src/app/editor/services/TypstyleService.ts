/**
 * TypstyleService — thin async wrapper around the typstyle WASM formatter.
 *
 * The `@typstyle/typstyle-wasm-bundler` build expects to be loaded by a
 * bundler that understands WebAssembly imports. Vite handles this transparently
 * because the project already has `vite-plugin-wasm` and
 * `vite-plugin-top-level-await` configured. The WASM is fetched on first call
 * and cached for the lifetime of the page.
 */

type TypstyleFormatModule = {
  format: (text: string, config: Partial<TypstyleConfig>) => string;
};

export interface TypstyleConfig {
  /** Number of spaces per indentation level. */
  tab_spaces: number;
  /** Maximum width per line before the formatter wraps. */
  max_width: number;
  /** Maximum number of consecutive blank lines allowed. */
  blank_lines_upper_bound: number;
  /** Collapse consecutive whitespace in markup into one space. */
  collapse_markup_spaces: boolean;
  /** Sort imported items alphabetically. */
  reorder_import_items: boolean;
  /** Wrap markup text to fit max_width (implies collapse_markup_spaces). */
  wrap_text: boolean;
}

export const DEFAULT_TYPSTYLE_CONFIG: TypstyleConfig = {
  tab_spaces: 2,
  max_width: 80,
  blank_lines_upper_bound: 2,
  collapse_markup_spaces: false,
  reorder_import_items: true,
  wrap_text: false,
};

let modulePromise: Promise<TypstyleFormatModule> | null = null;

function loadModule(): Promise<TypstyleFormatModule> {
  if (modulePromise) return modulePromise;
  // Dynamic import lets Vite split the WASM out of the main bundle.
  modulePromise = import("@typstyle/typstyle-wasm-bundler")
    .then((mod) => ({
      format: mod.format,
    }))
    .catch((err) => {
      modulePromise = null;
      throw err;
    });
  return modulePromise;
}

/**
 * Format a Typst source string. Throws if the source is syntactically broken
 * enough that typstyle refuses to format it.
 */
export async function format(
  source: string,
  opts: Partial<TypstyleConfig> = {},
): Promise<string> {
  const mod = await loadModule();
  const config: TypstyleConfig = { ...DEFAULT_TYPSTYLE_CONFIG, ...opts };
  return mod.format(source, config);
}
