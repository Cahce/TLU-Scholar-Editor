/**
 * ZoteroIcon
 *
 * Stylised "Z" mark for the Zotero sidebar button. Drawn as three strokes
 * (top bar, diagonal, bottom bar) so it reads as Z at small sizes while
 * matching the lucide-react outline aesthetic used everywhere else in the
 * workspace rail. Picks up `currentColor` from the parent button so it
 * still highlights blue on hover/active without hard-coding the Zotero
 * brand red — that would clash with the active-state color used by the
 * rest of the rail.
 */

interface ZoteroIconProps {
  className?: string;
}

export function ZoteroIcon({ className }: ZoteroIconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 5h12" />
      <path d="M18 5 6 19" />
      <path d="M6 19h12" />
    </svg>
  );
}
