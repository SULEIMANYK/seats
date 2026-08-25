import { ImageResponse } from "next/og";
import { SITE } from "@/lib/config";
import { BOARD_SIZE } from "@/lib/seating";

export const runtime = "nodejs";
export const alt = SITE.tagline;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The share card. Drawn rather than screenshotted so it stays correct when
 * the board is empty — which, with a nightly clear, is most of the time.
 */
export default function Image() {
  const seat = (x: number, y: number, w: number, h: number, fill: string) => (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 10, background: fill }} />
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center", background: "#fdf8f1",
          fontFamily: "sans-serif", position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 96, background: "#7c2d2d" }} />

        <div style={{ position: "relative", width: 760, height: 210, display: "flex", marginTop: 40 }}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => seat(40 + i * 104, 8 + Math.abs(i - 3) * -6 + 18, 84, 62, "rgba(124,45,45,0.10)"))}
          {[0, 1, 2, 3, 4].map((i) => seat(140 + i * 104, 124 + Math.abs(i - 2) * -5, 84, 66, i === 2 ? "#e0a15f" : "rgba(124,45,45,0.18)"))}
        </div>

        <div style={{ display: "flex", fontSize: 76, fontWeight: 700, letterSpacing: -3, color: "#2b2018", marginTop: 46 }}>
          seats<span style={{ color: "rgba(43,32,24,0.4)" }}>.lol</span>
        </div>

        <div style={{ display: "flex", fontSize: 27, color: "#8a7a6b", marginTop: 14 }}>
          {BOARD_SIZE} free seats · cleared every midnight
        </div>
      </div>
    ),
    size,
  );
}
