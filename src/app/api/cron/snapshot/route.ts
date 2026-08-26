import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Records the day's board.
 *
 * Runs after midnight UTC and captures the day that just ended, which it
 * names explicitly rather than inferring from the clock. Vercel's Hobby plan
 * triggers crons within the hour of their schedule, not at the minute, so the
 * date at execution time is not a reliable answer to "which day am I saving".
 *
 * Re-running for the same day overwrites rather than duplicating, so a retry
 * is safe.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Name the day explicitly. The cron runs after midnight UTC, so the day
  // that just ended is yesterday -- and on Hobby the firing time drifts by up
  // to an hour, which makes "whatever day it is when I run" the wrong answer
  // some of the time and the right one the rest.
  const day = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data, error } = await db().rpc("snapshot_board", { p_day: day });
  if (error) {
    console.error("snapshot failed", error);
    return NextResponse.json({ error: "Snapshot failed" }, { status: 500 });
  }

  return NextResponse.json({ day, recorded: data });
}
