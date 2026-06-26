import { describe, expect, it } from "vitest";
import {
  findActiveHeadingFromCursor,
  findAnchorFromClick,
  findSourcePosInProject,
  mergeSyncEntries,
  parseSourceHeadings,
  type FrameLoc,
  type HeadingSyncEntry,
} from "../TypstSourceMapService";

// Three headings across two pages, in document order.
const entries: HeadingSyncEntry[] = [
  { file: "main.typ", sourceLine: 1, level: 1, title: "A", page: 1, yPt: 100 },
  { file: "main.typ", sourceLine: 10, level: 1, title: "B", page: 1, yPt: 400 },
  { file: "main.typ", sourceLine: 20, level: 1, title: "C", page: 2, yPt: 80 },
];

const at = (page: number, yPt: number, xPt = 0): FrameLoc => ({ page, xPt, yPt });

describe("findAnchorFromClick", () => {
  it("returns the heading the click sits under on the same page", () => {
    // Click between A (y=100) and B (y=400) on page 1 → A.
    expect(findAnchorFromClick(entries, at(1, 250))?.title).toBe("A");
    // Click below B on page 1 → B.
    expect(findAnchorFromClick(entries, at(1, 500))?.title).toBe("B");
    // Click below C on page 2 → C.
    expect(findAnchorFromClick(entries, at(2, 300))?.title).toBe("C");
  });

  it("falls back to the last heading of an earlier page when the click is above the page's first heading", () => {
    // Page 2, above C (y=80) → last heading of page 1 (B).
    expect(findAnchorFromClick(entries, at(2, 40))?.title).toBe("B");
  });

  it("returns null when the click is above the very first heading", () => {
    expect(findAnchorFromClick(entries, at(1, 50))).toBeNull();
  });

  it("returns null for an empty anchor list", () => {
    expect(findAnchorFromClick([], at(1, 100))).toBeNull();
  });

  it("ignores xPt for heading-level resolution (coarse mode)", () => {
    // Same y, different x must not change the chosen anchor.
    expect(findAnchorFromClick(entries, at(1, 250, 0))?.title).toBe(
      findAnchorFromClick(entries, at(1, 250, 999))?.title,
    );
  });
});

describe("findActiveHeadingFromCursor (multi-file scoping)", () => {
  // Document order interleaves files: Abstract lives in 90-Document.typ
  // (line 3), the Tutorial chapter in 92-Tutorial.typ (line 2) — each file's
  // source lines restart at 1, which is exactly why scoping matters.
  const multi: HeadingSyncEntry[] = [
    { file: "90-Document/90-Document.typ", sourceLine: 3, level: 1, title: "Abstract", page: 1, yPt: 100 },
    { file: "92-Tutorial/92-Tutorial.typ", sourceLine: 2, level: 1, title: "Document Tutorial", page: 7, yPt: 60 },
    { file: "92-Tutorial/92-Tutorial.typ", sourceLine: 5, level: 2, title: "About this Template", page: 7, yPt: 300 },
  ];

  it("resolves within the cursor's file only", () => {
    // Cursor on line 5 of 90-Document.typ: WITHOUT the file filter this used
    // to match "About this Template" (line 5 of ANOTHER file) — the wrong-
    // scroll bug. With the filter it must be Abstract.
    const hit = findActiveHeadingFromCursor(multi, 5, "90-Document/90-Document.typ");
    expect(hit?.title).toBe("Abstract");
  });

  it("returns null for a file with no headings", () => {
    expect(findActiveHeadingFromCursor(multi, 50, "utilities.typ")).toBeNull();
  });

  it("returns null when the cursor is above the file's first heading", () => {
    expect(
      findActiveHeadingFromCursor(multi, 1, "90-Document/90-Document.typ"),
    ).toBeNull();
  });

  it("picks the closest heading below the cursor within the file", () => {
    const hit = findActiveHeadingFromCursor(multi, 9, "92-Tutorial/92-Tutorial.typ");
    expect(hit?.title).toBe("About this Template");
  });

  it("keeps legacy whole-project behaviour when file is omitted", () => {
    expect(findActiveHeadingFromCursor(entries, 12)?.title).toBe("B");
  });
});

describe("parseSourceHeadings + mergeSyncEntries", () => {
  it("parses = headings and merges with output locations by level + title", () => {
    const src = "= One\n\nbody\n\n== Two\n";
    const heads = parseSourceHeadings(src);
    expect(heads.map((h) => h.sourceLine)).toEqual([1, 5]);

    const merged = mergeSyncEntries(heads, [
      { level: 1, body: "One", page: 1, xPt: 70, yPt: 90 },
      { level: 2, body: "Two", page: 1, xPt: 70, yPt: 300 },
    ]);
    expect(merged).toHaveLength(2);
    expect(merged[1]).toMatchObject({ sourceLine: 5, page: 1, yPt: 300 });
  });

  it("skips rendered-only headings (e.g. #outline titles) instead of misaligning", () => {
    const src = "= Intro\n\n== Methods\n";
    const heads = parseSourceHeadings(src);
    // A `#outline` title (no `= ` source line) renders FIRST — an ordinal zip
    // would then pair Intro→outline-pos and drift. Title matching skips it.
    const merged = mergeSyncEntries(heads, [
      { level: 1, body: "MỤC LỤC", page: 1, xPt: 70, yPt: 50 },
      { level: 1, body: "Intro", page: 2, xPt: 70, yPt: 60 },
      { level: 2, body: "Methods", page: 2, xPt: 70, yPt: 200 },
    ]);
    expect(merged.map((m) => m.title)).toEqual(["Intro", "Methods"]);
    expect(merged.map((m) => m.sourceLine)).toEqual([1, 3]);
  });

  it("orders merged entries by page then y", () => {
    const src = "= A\n\n= B\n";
    const heads = parseSourceHeadings(src);
    const merged = mergeSyncEntries(heads, [
      { level: 1, body: "B", page: 2, xPt: 0, yPt: 100 },
      { level: 1, body: "A", page: 1, xPt: 0, yPt: 100 },
    ]);
    expect(merged.map((m) => m.title)).toEqual(["A", "B"]);
  });
});

describe("findSourcePosInProject (token-overlap, multi-file)", () => {
  const files = [
    { path: "main.typ", content: '#include "chapters/Chuong4.typ"\n' },
    {
      path: "chapters/Chuong4.typ",
      content:
        "= Trích dẫn\n\nnhư đã được chứng minh bởi Donald Knuth trong tài liệu @knuth1984textbook.\n\n#table(\n  [1], [Giao diện], [Soạn thảo],\n)\n",
    },
  ];

  it("maps a citation line to the prose source line, not the [1] table cell", () => {
    // Rendered line reads '... trong tài liệu [1]'. Token overlap must pick the
    // prose line (11 tokens), not the table row whose only overlap is '1'.
    const hit = findSourcePosInProject(
      files,
      "như đã được chứng minh bởi Donald Knuth trong tài liệu [1]",
      "main.typ",
    );
    expect(hit?.file).toBe("chapters/Chuong4.typ");
    expect(hit?.line).toBe(3);
  });

  it("maps a math line to the line that holds its source", () => {
    const fs = [
      { path: "m.typ", content: "Định lý Pythagoras được viết dưới dạng $a^2 + b^2 = c^2$.\n" },
    ];
    expect(
      findSourcePosInProject(fs, "Định lý Pythagoras được viết dưới dạng a²+b²=c²", "m.typ")?.line,
    ).toBe(1);
  });

  it("resolves a prose run into the right included chapter", () => {
    const hit = findSourcePosInProject(files, "Donald Knuth trong tài liệu", "main.typ");
    expect(hit?.file).toBe("chapters/Chuong4.typ");
    expect(hit?.line).toBe(3);
  });

  it("prefers the previewed file when the line also appears there", () => {
    const fs2 = [
      { path: "a.typ", content: "shared phrase here today\n" },
      { path: "main.typ", content: "intro\nshared phrase here today\n" },
    ];
    expect(
      findSourcePosInProject(fs2, "shared phrase here today", "main.typ")?.file,
    ).toBe("main.typ");
  });

  it("scopes to a section via fromLine (ignores earlier duplicate content)", () => {
    const fs = [
      {
        path: "c.typ",
        content:
          "= Sec A\n\nshared example code line here\n\n= Sec B\n\nshared example code line here\n",
      },
    ];
    // No scope → first occurrence (line 3); fromLine at Sec B (5) → line 7.
    expect(findSourcePosInProject(fs, "shared example code line here", "c.typ")?.line).toBe(3);
    expect(findSourcePosInProject(fs, "shared example code line here", "c.typ", 5)?.line).toBe(7);
  });

  it("returns null for a lone short/numeric run", () => {
    expect(findSourcePosInProject(files, "[1]", "main.typ")).toBeNull();
    expect(findSourcePosInProject(files, "x", "main.typ")).toBeNull();
  });
});
