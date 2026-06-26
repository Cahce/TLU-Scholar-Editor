import { describe, it, expect } from "vitest";
import { renderEnumInfo } from "../richInfo";

// `renderEnumInfo` returns the rich-info DOM shell built by
// `buildInfoShell()` (see richInfo.ts):
//   div.cm-info-rich
//     div.cm-info-header  > span.cm-info-title  (+ span.cm-info-pill)
//     div.cm-info-body    > code.cm-info-tech   (when displayName !== value)
//                         > p.cm-info-desc      (infoVi)
//     div.cm-info-aliases > span.cm-info-aliases-label ("Alias")
//                         + span.cm-info-chip   (one per alias)
describe("renderEnumInfo", () => {
  it("renders displayName, infoVi and aliases", () => {
    const dom = renderEnumInfo({
      value: "institute-of-electrical-and-electronics-engineers",
      displayName: "IEEE",
      infoVi: "Tiêu chuẩn IEEE.",
      aliases: ["ieee"],
    });
    expect(dom.tagName).toBe("DIV");
    expect(dom.querySelector(".cm-info-title")?.textContent).toBe("IEEE");
    expect(dom.querySelector(".cm-info-desc")?.textContent).toBe(
      "Tiêu chuẩn IEEE.",
    );
    const aliases = dom.querySelector(".cm-info-aliases");
    expect(aliases?.querySelector(".cm-info-aliases-label")?.textContent).toBe(
      "Alias",
    );
    const chips = aliases?.querySelectorAll(".cm-info-chip");
    expect(chips?.length).toBe(1);
    expect(chips?.[0].textContent).toBe("ieee");
  });

  it("omits missing sections gracefully", () => {
    const dom = renderEnumInfo({
      value: "x",
      displayName: "Only Name",
    });
    expect(dom.querySelector(".cm-info-title")?.textContent).toBe("Only Name");
    expect(dom.querySelector(".cm-info-desc")).toBeNull();
    expect(dom.querySelector(".cm-info-aliases")).toBeNull();
  });

  it("falls back to the canonical value when displayName is missing", () => {
    const dom = renderEnumInfo({ value: "karger" });
    // Even with no friendly metadata we render the identifier so the
    // hover tooltip is never blank.
    expect(dom.querySelector(".cm-info-title")?.textContent).toBe("karger");
  });

  it("renders both displayName and the technical code when they differ", () => {
    const dom = renderEnumInfo({
      value: "american-physics-society",
      displayName: "American Physics Society (APS)",
    });
    expect(dom.querySelector(".cm-info-title")?.textContent).toBe(
      "American Physics Society (APS)",
    );
    // The tech code block is the `<code class="cm-info-tech">` element
    // itself — its textContent is the raw canonical value.
    expect(dom.querySelector(".cm-info-tech")?.textContent).toBe(
      "american-physics-society",
    );
  });

  it("renders each alias as its own chip", () => {
    const dom = renderEnumInfo({
      value: "x",
      displayName: "X",
      aliases: ["a", "b"],
    });
    const chips = dom.querySelectorAll(".cm-info-chip");
    expect(chips.length).toBe(2);
    expect(chips[0].textContent).toBe("a");
    expect(chips[1].textContent).toBe("b");
  });
});
