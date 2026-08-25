import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Records the day's board.
 *
 * Runs shortly before midnight UTC, so the snapshot captures a full day of
 * clicks rather than an hour of the next one. Re-running on the same day
 * overwrites rather than duplicating, so a retry is safe.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await db().rpc("snapshot_board");
  if (error) {
    console.error("snapshot failed", error);
    return NextResponse.json({ error: "Snapshot failed" }, { status: 500 });
  }

  return NextResponse.json({ recorded: data });
}
