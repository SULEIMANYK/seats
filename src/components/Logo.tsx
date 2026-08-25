/**
 * The mark: a stage with two arcs of seats curving away from it — the board
 * itself, small enough to read at 16px.
 *
 * The nearest seat takes the accent colour because that is the one people
 * are here for. It reads from --gold rather than a literal, so it follows
 * the theme instead of staying the brass of an older palette.
 */
export function Logo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Stage */}
      <rect x="6" y="4" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.9" />

      {/* Back row — five seats, bowing away from the stage */}
      <rect x="2.5" y="12" width="4" height="4.5" rx="1.2" fill="currentColor" opacity="0.28" />
      <rect x="8.5" y="13" width="4" height="4.5" rx="1.2" fill="currentColor" opacity="0.28" />
      <rect x="14" y="13.4" width="4" height="4.5" rx="1.2" fill="currentColor" opacity="0.28" />
      <rect x="19.5" y="13" width="4" height="4.5" rx="1.2" fill="currentColor" opacity="0.28" />
      <rect x="25.5" y="12" width="4" height="4.5" rx="1.2" fill="currentColor" opacity="0.28" />

      {/* Front row — the gold one is the seat everyone wants */}
      <rect x="5" y="21" width="5" height="5.5" rx="1.5" fill="currentColor" opacity="0.5" />
      <rect x="13" y="22" width="6" height="5.5" rx="1.5" fill="var(--gold)" />
      <rect x="22" y="21" width="5" height="5.5" rx="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
