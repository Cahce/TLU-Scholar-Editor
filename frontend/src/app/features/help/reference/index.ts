import { normalizeText } from "../helpContent";
import type { ReferenceCategory, ReferenceFn, ReferenceParam } from "./types";
import { ALL_CATEGORIES } from "./categories";

/**
 * Danh mục tra cứu Typst. Mỗi category là một file dữ liệu; thêm category mới =
 * import + thêm vào mảng này.
 * (Pha 1: visualize; Pha 2: model, text, layout; Pha 3: math, foundations,
 * introspection, data-loading. Pha 4 sẽ thêm symbols + pdf.)
 */
export const REFERENCE: ReferenceCategory[] = ALL_CATEGORIES;

export function getCategory(slug: string | undefined): ReferenceCategory | undefined {
  if (!slug) return undefined;
  return REFERENCE.find((c) => c.slug === slug);
}

export function getFn(
  categorySlug: string | undefined,
  fnSlug: string | undefined,
): { category: ReferenceCategory; fn: ReferenceFn } | undefined {
  const category = getCategory(categorySlug);
  if (!category || !fnSlug) return undefined;
  const fn = category.fns.find((f) => f.slug === fnSlug);
  return fn ? { category, fn } : undefined;
}

export interface ReferenceSearchHit {
  category: ReferenceCategory;
  fn: ReferenceFn;
  /** Tham số khớp truy vấn (nếu kết quả khớp nhờ tên/mô tả tham số). */
  matchedParam?: ReferenceParam;
  /** Định nghĩa con khớp truy vấn (table.cell, gradient.linear...). */
  matchedMember?: ReferenceFn;
}

/**
 * Tìm theo tên hàm + tóm tắt + category + (tên/mô tả) THAM SỐ — so khớp không
 * dấu, không phân biệt hoa thường.
 */
export function searchReference(query: string): ReferenceSearchHit[] {
  const q = normalizeText(query);
  if (!q) return [];
  const hits: ReferenceSearchHit[] = [];
  for (const category of REFERENCE) {
    for (const fn of category.fns) {
      const base = normalizeText(
        [fn.name, fn.summary, fn.signature, category.title].join(" "),
      );
      if (base.includes(q)) {
        hits.push({ category, fn });
        continue;
      }
      const matchedParam = fn.params.find((p) =>
        normalizeText(`${p.name} ${p.desc}`).includes(q),
      );
      if (matchedParam) {
        hits.push({ category, fn, matchedParam });
        continue;
      }
      const matchedMember = fn.members?.find((m) =>
        normalizeText(
          [m.name, m.summary, ...m.params.map((p) => `${p.name} ${p.desc}`)].join(" "),
        ).includes(q),
      );
      if (matchedMember) hits.push({ category, fn, matchedMember });
    }
  }
  return hits;
}
