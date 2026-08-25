import { createHash } from "node:crypto";
import type { db } from "./db";

/**
 * A crude per-IP limiter backed by the rows an action creates.
 *
 * There is no counter table on purpose: every limited action already writes
 * something with a timestamp and a hashed IP, so counting those is both the
 * cheapest implementation and impossible to get out of step with reality.
 */
export function hashIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  return createHash("sha256")
    .update(ip + (process.env.CLICK_SALT ?? "seats.lol"))
    .digest("hex")
    .slice(0, 32);
}

export async function tooManyRecently(
  supabase: ReturnType<typeof db>,
  table: string,
  column: string,
  value: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value)
    .gte("created_at", since);
  return (count ?? 0) >= limit;
}
