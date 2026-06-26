import type { ReferenceCategory } from "./types";
import { model } from "./model";
import { text } from "./text";
import { layout } from "./layout";
import { math } from "./math";
import { visualize } from "./visualize";
import { foundations } from "./foundations";
import { introspection } from "./introspection";
import { dataLoading } from "./dataLoading";
import { pdf } from "./pdf";

/**
 * Dữ liệu thuần các category (chỉ phụ thuộc lucide-react + types) — tách khỏi
 * `index.ts` để extractor snapshot có thể bundle/đọc mà KHÔNG kéo theo
 * `helpContent`/topics. Thêm category mới: import + thêm vào mảng này.
 */
export const ALL_CATEGORIES: ReferenceCategory[] = [
  model,
  text,
  layout,
  math,
  visualize,
  foundations,
  introspection,
  dataLoading,
  pdf,
];
