/**
 * The mark: two chairs.
 *
 * Written as an escaped surrogate pair rather than a literal emoji so the
 * source stays ASCII — a literal survives most toolchains and then fails
 * silently in the one that re-encodes it, and mojibake in a logo is not
 * something a build error would ever catch.
 *
 * Emoji render from the system font, so an explicit stack is set: without
 * one, a machine whose default sans has no chair glyph draws tofu.
 */
const CHAIRS = "\uD83E\uDE91\uD83E\uDE91";

export function Logo({ className = "text-lg" }: { className?: string }) {
  return (
    <span
      // whitespace-nowrap and no fixed box: two emoji are wider than they are
      // tall, so a square (size-7) wrapped them onto two lines. The caller
      // sizes the mark with a font-size class, which is what emoji actually
      // scale by -- they ignore `color` and width entirely.
      className={`inline-flex items-center whitespace-nowrap leading-none ${className}`}
      style={{
        fontFamily:
          '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
      }}
      role="img"
      aria-label="seats"
    >
      {CHAIRS}
    </span>
  );
}
