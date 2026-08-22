import { createHash } from "node:crypto";
import { db } from "./db";

/**
 * Records a page view.
 *
 * Fire-and-forget on purpose: a slow or failing insert must never delay the
 * page, and a lost visit matters far less than a lost render. The IP is
 * hashed with a server-side salt, so the raw address is never stored — the
 * hash exists only to count unique visitors.
 */
export function recordVisit(path: string, headers: Headers): void {
  const forwarded = headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";

  const ipHash = createHash("sha256")
    .update(ip + (process.env.CLICK_SALT ?? "seats.lol"))
    .digest("hex")
    .slice(0, 32);

  // Bots hammer the homepage; skip the obvious ones so the numbers a buyer
  // sees reflect people rather than crawlers.
  const ua = headers.get("user-agent")?.toLowerCase() ?? "";
  if (/bot|crawler|spider|curl|wget|headless|lighthouse|preview/.test(ua)) return;

  void db()
    .from("visits")
    .insert({
      path: path.slice(0, 200),
      ip_hash: ipHash,
      referer: headers.get("referer")?.slice(0, 500) ?? null,
    })
    .then(({ error }) => {
      if (error) console.error("visit insert failed", error);
    });
}

export type BoardStats = {
  visits_total: number;
  visits_24h: number;
  visitors_24h: number;
  clicks_total: number;
  clicks_24h: number;
  seats_taken: number;
  mrr_cents: number;
};

export async function getStats(): Promise<BoardStats | null> {
  try {
    const { data, error } = await db().from("board_stats").select("*").maybeSingle<BoardStats>();
    if (error) {
      console.error("stats query failed", error);
      return null;
    }
    return data;
  } catch (err) {
    console.error("stats unavailable", err);
    return null;
  }
}
