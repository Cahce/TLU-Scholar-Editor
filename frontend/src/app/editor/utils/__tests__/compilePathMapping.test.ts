import { describe, expect, it } from "vitest";

import {
  createCompilePathMapping,
  restoreDiagnosticPaths,
} from "../compilePathMapping";

describe("compilePathMapping", () => {
  it("keeps normal root-relative projects unchanged", () => {
    const mapping = createCompilePathMapping(
      {
        "main.typ": "#include \"chapters/intro.typ\"",
        "chapters/intro.typ": "= Intro",
      },
      "main.typ",
    );

    expect(mapping.appliedRootPrefix).toBeNull();
    expect(mapping.root).toBe("/");
    expect(mapping.mainFile).toBe("main.typ");
    expect(Object.keys(mapping.files).sort()).toEqual([
      "chapters/intro.typ",
      "main.typ",
    ]);
  });

  it("rebases a legacy imported archive wrapper for compile only", () => {
    const mapping = createCompilePathMapping(
      {
        "templatemaudoantotnghiep/main.typ": "#include \"chapters/Chuong3.typ\"",
        "templatemaudoantotnghiep/chapters/Chuong3.typ": "= Chuong 3",
        "templatemaudoantotnghiep/bibliography.bib": "@article{sample2024}",
      },
      "templatemaudoantotnghiep/main.typ",
    );

    expect(mapping.appliedRootPrefix).toBe("templatemaudoantotnghiep");
    expect(mapping.mainFile).toBe("main.typ");
    expect(Object.keys(mapping.files).sort()).toEqual([
      "bibliography.bib",
      "chapters/Chuong3.typ",
      "main.typ",
    ]);
  });

  it("preserves ambiguous folders without Typst project markers", () => {
    const mapping = createCompilePathMapping(
      {
        "docs/readme.txt": "notes",
        "docs/data.csv": "a,b\n1,2",
      },
      "docs/readme.txt",
    );

    expect(mapping.appliedRootPrefix).toBeNull();
    expect(mapping.mainFile).toBe("docs/readme.txt");
    expect(Object.keys(mapping.files).sort()).toEqual([
      "docs/data.csv",
      "docs/readme.txt",
    ]);
  });

  it("does not rebase nested main files when files are not under one wrapper", () => {
    const mapping = createCompilePathMapping(
      {
        "src/document.typ": "#import \"../lib/theme.typ\"",
        "lib/theme.typ": "#let theme = none",
      },
      "src/document.typ",
    );

    expect(mapping.appliedRootPrefix).toBeNull();
    expect(mapping.mainFile).toBe("src/document.typ");
    expect(Object.keys(mapping.files).sort()).toEqual([
      "lib/theme.typ",
      "src/document.typ",
    ]);
  });

  it("maps diagnostics from rebased compile paths back to stored paths", () => {
    const mapping = createCompilePathMapping(
      {
        "templatemaudoantotnghiep/main.typ": "#include \"chapters/Chuong3.typ\"",
        "templatemaudoantotnghiep/chapters/Chuong3.typ": "#bad",
      },
      "templatemaudoantotnghiep/main.typ",
    );

    const diagnostics = restoreDiagnosticPaths(
      [
        {
          source: "client",
          severity: "error",
          message: "failed",
          file: "chapters/Chuong3.typ",
        },
      ],
      mapping.diagnosticPathMap,
    );

    expect(diagnostics[0].file).toBe(
      "templatemaudoantotnghiep/chapters/Chuong3.typ",
    );
  });
});
