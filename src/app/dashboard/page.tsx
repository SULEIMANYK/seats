import Link from "next/link";
import { redirect } from "next/navigation";
import { currentEmail } from "@/lib/auth";
import { SITE } from "@/lib/config";
import { db } from "@/lib/db";
import { displayDomain } from "@/lib/slug";

export const dynamic = "force-dynamic";
export const metadata = { title: `Your seat — ${SITE.domain}`, robots: { index: false } };

type Mine = {
  id: string;
  slug: string;
  name: string;
  url: string;
  seat: number | null;
  manage_token: string;
  status: string;
};

export default async function DashboardPage() {
  const email = await currentEmail();
  if (!email) redirect("/signin?next=%2Fdashboard");

  let mine: Mine[] = [];
  try {
    const { data } = await db()
      .from("listings")
      .select("id, slug, name, url, seat, manage_token, status")
      .eq("owner_email", email)
      .in("status", ["active", "past_due", "grace"])
      .returns<Mine[]>();
    mine = data ?? [];
  } catch (err) {
    console.error("dashboard lookup failed", err);
  }

  return (
    <main className="stage relative mx-auto w-full max-w-2xl px-5 py-12 sm:px-8">
      <Link href="/" className="relative z-10 text-sm text-muted hover:text-fg">
        ← back to the board
      </Link>

      <header className="relative z-10 mt-6 mb-8">
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Your seat</h1>
        <p className="mt-2 text-[13px] text-muted">{email}</p>
      </header>

      {mine.length === 0 ? (
        <div className="relative z-10 rounded-2xl border border-dashed border-edge-strong/60 p-10 text-center">
          <p className="text-[15px] font-semibold">You don&apos;t have a seat yet.</p>
          <p className="mt-1.5 text-[13px] text-muted">Pick one from the board and claim it.</p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-xl bg-fg px-4 py-2.5 text-[13px] font-semibold text-bg-lift"
          >
            See the board
          </Link>
        </div>
      ) : (
        <ul className="relative z-10 space-y-2">
          {mine.map((l) => (
            <li key={l.id}>
              <Link
                href={`/manage/${l.manage_token}`}
                className="flex items-center gap-4 rounded-2xl border border-edge bg-panel p-4 card-shadow transition-all duration-200 hover:-translate-y-0.5 hover:card-shadow-lift"
              >
                <span className="tnum w-10 shrink-0 text-center text-[15px] font-semibold text-gold">
                  {l.seat ?? "—"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{l.name}</span>
                  <span className="block truncate text-[12px] text-muted">
                    {displayDomain(l.url)}
                    {l.status !== "active" && ` · ${l.status}`}
                  </span>
                </span>
                <span className="shrink-0 text-[12px] text-muted">Manage →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="relative z-10 mt-12 text-[11px] text-muted/60">{SITE.domain}</p>
    </main>
  );
}
