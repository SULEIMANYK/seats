import { NextResponse } from "next/server";
import { authClient } from "@/lib/auth";

export const runtime = "nodejs";

/** Exchanges the magic-link code for a session cookie. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

  // Relative paths only — an absolute one would let a crafted link redirect
  // someone off-site while carrying a fresh session.
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (!code) return NextResponse.redirect(new URL("/signin?error=missing", url.origin));

  const { error } = await (await authClient()).auth.exchangeCodeForSession(code);
  if (error) {
    console.error("code exchange failed", error);
    return NextResponse.redirect(new URL("/signin?error=expired", url.origin));
  }

  return NextResponse.redirect(new URL(target, url.origin));
}
