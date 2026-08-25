"use client";

import { useState } from "react";

/**
 * A listing's logo, falling back to its favicon.
 *
 * A supplied URL can 404, be hotlink-blocked, or simply rot. Without a
 * fallback that leaves an empty box on the seat, which reads as a broken
 * board rather than a broken link.
 */
export function Favicon({
  logoUrl,
  domain,
  alt = "",
  className,
  style,
}: {
  logoUrl: string | null;
  domain: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const fallback = `/api/icon?domain=${encodeURIComponent(domain)}`;
  const [src, setSrc] = useState(logoUrl ?? fallback);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      className={className}
      style={style}
      onError={() => {
        if (src !== fallback) setSrc(fallback);
      }}
    />
  );
}
