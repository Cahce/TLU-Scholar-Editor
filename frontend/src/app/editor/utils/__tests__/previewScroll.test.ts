import { describe, it, expect } from "vitest";
import { computeFollowScrollTop } from "../previewScroll";

const base = {
  containerScrollTop: 0,
  containerHeight: 1000,
  pageTop: 0,
  pageRenderedHeight: 1000,
  yPt: 0,
  pageHeightPt: 842,
};

describe("computeFollowScrollTop", () => {
  it("returns null when the target is already in the middle band", () => {
    // Target at 50% of a 1000px viewport with scrollTop 0 → inside 20–80%.
    expect(
      computeFollowScrollTop({ ...base, yPt: 421 }), // ~500px
    ).toBeNull();
  });

  it("scrolls down to a target below the band, landing at 35%", () => {
    // Page 3 starts at 3000px; target near its middle.
    const top = computeFollowScrollTop({
      ...base,
      pageTop: 3000,
      yPt: 421, // → 3000 + 500 = 3500px
    });
    expect(top).toBe(3500 - 350);
  });

  it("scrolls up when the target is above the viewport", () => {
    const top = computeFollowScrollTop({
      ...base,
      containerScrollTop: 5000,
      pageTop: 1000,
      yPt: 0, // target at 1000px, far above scrollTop 5000
    });
    expect(top).toBe(1000 - 350);
  });

  it("never returns a negative scrollTop", () => {
    const top = computeFollowScrollTop({
      ...base,
      containerScrollTop: 2000,
      pageTop: 100,
      yPt: 0,
    });
    expect(top).toBe(0);
  });

  it("accounts for zoom via the rendered page height", () => {
    // 150% zoom: rendered height 1500px for the same 842pt page.
    const top = computeFollowScrollTop({
      ...base,
      containerScrollTop: 4000,
      pageTop: 3000,
      pageRenderedHeight: 1500,
      yPt: 421,
    });
    // target = 3000 + (421/842)*1500 ≈ 3750 → above band (4000+200) → scroll up
    expect(top).toBe(Math.max(0, 3750 - 350));
  });

  it("clamps out-of-range yPt into the page", () => {
    const top = computeFollowScrollTop({
      ...base,
      pageTop: 3000,
      yPt: 99999,
    });
    expect(top).toBe(4000 - 350); // page bottom
  });

  it("returns null for unusable inputs", () => {
    expect(computeFollowScrollTop({ ...base, pageHeightPt: null })).toBeNull();
    expect(computeFollowScrollTop({ ...base, pageRenderedHeight: 0 })).toBeNull();
    expect(computeFollowScrollTop({ ...base, containerHeight: 0 })).toBeNull();
  });
});
