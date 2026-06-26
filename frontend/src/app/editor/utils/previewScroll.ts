/**
 * Follow-typing scroll geometry (spec: typing-latency-and-follow-preview
 * FT-5/FT-6). Pure math so both preview canvases (SVG pages, PDF canvases)
 * share one tested implementation.
 *
 * All pixel inputs are CONTENT coordinates of the scroll container (i.e.
 * already include any CSS `zoom` scaling — callers measure via
 * getBoundingClientRect, which reports zoomed values, and add scrollTop).
 */

/** Fraction of the viewport considered "already visible" — no scroll. */
const COMFORT_BAND_TOP = 0.2;
const COMFORT_BAND_BOTTOM = 0.8;
/** Where the target lands after a scroll (fraction from the top). */
const LANDING_FRACTION = 0.35;

export interface FollowScrollInput {
  /** Current scrollTop of the scroll container. */
  containerScrollTop: number;
  /** Visible height of the scroll container. */
  containerHeight: number;
  /** Page's top edge in container CONTENT coordinates. */
  pageTop: number;
  /** Page's rendered height in px (post-zoom). */
  pageRenderedHeight: number;
  /** Target y inside the page, in pt. */
  yPt: number;
  /** The page's logical height in pt (from its viewBox); null = unknown. */
  pageHeightPt: number | null;
}

/**
 * Returns the scrollTop to animate to, or null when no scroll should happen
 * (target already in the comfortable middle band, or inputs unusable).
 */
export function computeFollowScrollTop(input: FollowScrollInput): number | null {
  const {
    containerScrollTop,
    containerHeight,
    pageTop,
    pageRenderedHeight,
    yPt,
    pageHeightPt,
  } = input;
  if (
    !Number.isFinite(pageTop) ||
    containerHeight <= 0 ||
    pageRenderedHeight <= 0 ||
    pageHeightPt == null ||
    pageHeightPt <= 0
  ) {
    return null;
  }

  const clampedYPt = Math.min(Math.max(yPt, 0), pageHeightPt);
  const targetY = pageTop + (clampedYPt / pageHeightPt) * pageRenderedHeight;

  const bandTop = containerScrollTop + containerHeight * COMFORT_BAND_TOP;
  const bandBottom = containerScrollTop + containerHeight * COMFORT_BAND_BOTTOM;
  if (targetY >= bandTop && targetY <= bandBottom) return null;

  return Math.max(0, targetY - containerHeight * LANDING_FRACTION);
}
