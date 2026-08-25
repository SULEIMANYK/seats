"use client";

import { useState } from "react";

/**
 * A listing's screenshot, with no fallback to fall back to.
 *
 * Logos have a favicon to drop back to when their URL rots (see Favicon.tsx),
 * but there's no equivalent stand-in for a screenshot — a broken one is just
 * a blank panel. Rendering nothing lets the card collapse cleanly instead of
 * holding open an empty box.
 */
export function Screenshot({ src, className }: { src: string; className?: string }) {
  const [broken, setBroken] = useState(false);

  if (broken) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setBroken(true)}
    />
  );
}
