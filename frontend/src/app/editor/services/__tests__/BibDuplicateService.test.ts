import { describe, expect, it } from "vitest";
import {
  analyzeBibSource,
  applyChangesToSource,
  buildDuplicateResolutionChanges,
  parseBibEntriesWithRanges,
} from "../BibDuplicateService";

const source = `@article{smith2024,
  author = {Smith, Jane},
  title = {Learning Typst},
  year = {2024},
  doi = {10.1000/example}
}

@article{smith2024b,
  author = {Jane Smith},
  title = {Learning Typst},
  year = {2024},
  doi = {https://doi.org/10.1000/EXAMPLE}
}
`;

describe("BibDuplicateService", () => {
  it("parses entries with source ranges", () => {
    const { entries } = parseBibEntriesWithRanges(source);

    expect(entries).toHaveLength(2);
    expect(entries[0].key).toBe("smith2024");
    expect(source.slice(entries[1].range.from, entries[1].range.to)).toContain(
      "@article{smith2024b"
    );
  });

  it("detects duplicate DOI and title-author-year groups", () => {
    const analysis = analyzeBibSource(source);

    expect(analysis.duplicateGroups).toHaveLength(1);
    expect(analysis.duplicateGroups[0].reasons).toEqual([
      "doi",
      "title_author_year",
    ]);
  });

  it("builds keep-first cleanup changes", () => {
    const analysis = analyzeBibSource(source);
    const changes = buildDuplicateResolutionChanges(
      source,
      analysis.duplicateGroups[0],
      "keep_first"
    );
    const cleaned = applyChangesToSource(source, changes);

    expect(cleaned).toContain("@article{smith2024,");
    expect(cleaned).not.toContain("@article{smith2024b,");
  });

  it("renames duplicate copies without dropping fields", () => {
    const analysis = analyzeBibSource(`@article{same,
  author = {A},
  title = {T},
  year = {2024}
}

@article{same,
  author = {B},
  title = {U},
  year = {2025}
}
`);
    const changes = buildDuplicateResolutionChanges(
      analysis.entries.map((entry) => entry.source).join(""),
      analysis.duplicateGroups[0],
      "rename"
    );
    const renamed = applyChangesToSource(
      analysis.entries.map((entry) => entry.source).join(""),
      changes
    );

    expect(renamed).toContain("@article{same,");
    expect(renamed).toContain("@article{same_2,");
    expect(renamed).toMatch(/title\s+= \{U\}/);
  });
});
