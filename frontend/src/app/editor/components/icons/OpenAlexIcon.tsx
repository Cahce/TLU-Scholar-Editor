/**
 * OpenAlexIcon
 *
 * Three-node graph mark for the OpenAlex sidebar button. OpenAlex is an
 * open scholarly knowledge graph; the icon evokes that with a triangle of
 * connected nodes rather than the previous generic telescope. Stroke-based
 * to match lucide-react and `currentColor` so the rail's active-state blue
 * still applies.
 */

interface OpenAlexIconProps {
  className?: string;
}

export function OpenAlexIcon({ className }: OpenAlexIconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Edges between nodes — drawn first so the node circles sit on top */}
      <path d="m7 7 10 0" />
      <path d="M7.7 8.4 11.3 16" />
      <path d="M16.3 8.4 12.7 16" />
      {/* Three nodes: two at the top corners, one at the bottom centre */}
      <circle cx="6" cy="6" r="2" fill="currentColor" />
      <circle cx="18" cy="6" r="2" fill="currentColor" />
      <circle cx="12" cy="18" r="2" fill="currentColor" />
    </svg>
  );
}
