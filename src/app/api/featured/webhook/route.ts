import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Grants a featured placement once Dodo confirms payment.
 *
 * This is the only thing that grants placement. The return URL the buyer
 * lands on afterwards is under their control -- they can visit it without
 * paying -- so it shows a pending state and nothing more.
 *
 * Standard Webhooks signing: the signature covers "<id>.<timestamp>.<body>",
 * so the raw body has to be read before anything parses it.
 */
const TOLERANCE_MS = 5 * 60 * 1000;

function verify(secret: string, id: string, timestamp: string, body: string, header: string) {
  // The secret is base64 after a "whsec_" prefix.
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");

  // The header carries a space-separated list of "v1,<sig>" -- more than one
  // while a secret is being rotated.
  for (const part of header.split(" ")) {
    const sig = part.includes(",") ? part.split(",")[1] : part;
    if (!sig) continue;
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

export async function POST(request: Request) {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("featured webhook called but DODO_WEBHOOK_SECRET is unset");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const id = request.headers.get("webhook-id");
  const timestamp = request.headers.get("webhook-timestamp");
  const signature = request.headers.get("webhook-signature");
  const raw = await request.text();

  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: "Unsigned" }, { status: 401 });
  }

  // Reject anything old enough to be a replay of a captured request.
  const sent = Number(timestamp) * 1000;
  if (!Number.isFinite(sent) || Math.abs(Date.now() - sent) > TOLERANCE_MS) {
    return NextResponse.json({ error: "Stale timestamp" }, { status: 401 });
  }

  if (!verify(secret, id, timestamp, raw, signature)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  let event: {
    type?: string;
    data?: { metadata?: Record<string, string>; payment_id?: string; total_amount?: number; currency?: string; customer?: { email?: string } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only a completed payment grants anything.
  if (event.type !== "payment.succeeded") {
    return NextResponse.json({ ok: true, ignored: event.type ?? "unknown" });
  }

  const domain = event.data?.metadata?.domain;
  if (!domain) {
    console.error("payment.succeeded with no domain in metadata", event.data?.payment_id);
    return NextResponse.json({ ok: true, ignored: "no domain" });
  }

  // Upsert on domain: a webhook can be delivered more than once, and paying
  // twice for the same product should not create two rows or fail loudly.
  const { error } = await db()
    .from("featured")
    .upsert(
      {
        domain,
        payment_id: event.data?.payment_id ?? null,
        amount_cents: event.data?.total_amount ?? null,
        currency: event.data?.currency ?? null,
        email: event.data?.customer?.email ?? null,
      },
      { onConflict: "domain" },
    );

  if (error) {
    console.error("featured upsert failed", error);
    // A 500 tells Dodo to retry, which is what we want -- the payment
    // happened and the placement is owed.
    return NextResponse.json({ error: "Could not record placement" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, domain });
}
