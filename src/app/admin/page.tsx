import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SITE } from "@/lib/config";

export const dynamic = "force-dynamic";
// This is a moderation tool, not a page — keep it out of search entirely.
export const metadata = { robots: { index: false, follow: false } };

const REASON_LABEL: Record<string, string> = {
  spam: "Spam",
  scam: "Scam",
  broken: "Broken link",
  nsfw: "NSFW",
  other: "Other",
};

type ReportRow = {
  id: string;
  reason: string;
  note: string | null;
  created_at: string;
};

type ListingSummary = {
  id: string;
  slug: string;
  name: string;
  url: string;
  domain: string;
  status: string;
  seat: number | null;
  email: string | null;
};

type Group = { listing: ListingSummary; reports: ReportRow[] };

async function loadReportedListings(): Promise<Group[]> {
  const supabase = db();

  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, reason, note, created_at, listing:listings(id, slug, name, url, domain, status, seat, email)",
    )
    .order("created_at", { ascending: false })
    .returns<(ReportRow & { listing: ListingSummary | null })[]>();

  if (error) {
    console.error("admin: failed to load reports", error);
    return [];
  }

  const groups = new Map<string, Group>();
  for (const row of data ?? []) {
    // The listing was deleted outright rather than taken down through here;
    // nothing left to act on.
    if (!row.listing) continue;
    const { listing, ...report } = row;
    const existing = groups.get(listing.id);
    if (existing) existing.reports.push(report);
    else groups.set(listing.id, { listing, reports: [report] });
  }

  // Worst offenders first — that's the entire point of this page.
  return [...groups.values()].sort((a, b) => b.reports.length - a.reports.length);
}

/**
 * The only view of abuse reports. Gated by a secret in the URL: a wrong or
 * missing key renders a plain 404, the same as this route not existing,
 * rather than a 403 that would confirm it does.
 *
 * The takedown button below posts to /api/admin, which re-checks this same
 * gate on its own: this page being locked down is not what makes the action
 * safe, the API route is.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const adminKey = process.env.ADMIN_KEY;

  if (!adminKey || key !== adminKey) notFound();

  const groups = await loadReportedListings();

  return (
    <main className="stage relative mx-auto w-full max-w-3xl px-5 py-12 sm:px-8">
      <header className="relative z-10 mb-8">
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">Reported listings</h1>
        <p className="tnum mt-2 text-[13px] text-muted">
          {groups.length} {groups.length === 1 ? "listing" : "listings"} flagged on {SITE.domain}
        </p>
      </header>

      {groups.length === 0 ? (
        <div className="relative z-10 rounded-2xl border border-dashed border-edge-strong/60 p-10 text-center">
          <p className="text-[15px] font-semibold">Nothing reported.</p>
          <p className="mt-1.5 text-[13px] text-muted">The board is clean right now.</p>
        </div>
      ) : (
        <ol className="relative z-10 space-y-3">
          {groups.map(({ listing, reports }) => {
            const takenDown = listing.status === "canceled";
            return (
              <li
                key={listing.id}
                className="rounded-2xl border border-edge bg-panel p-4 card-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">{listing.name}</p>
                    <p className="truncate text-[12px] text-muted">
                      {listing.domain} · {listing.url}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted/70">
                      contact: {listing.email ?? "none given"} · status: {listing.status}
                      {listing.seat ? ` · seat #${listing.seat}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tnum rounded-full bg-gold-soft px-2.5 py-1 text-[12px] font-semibold text-gold">
                      {reports.length} {reports.length === 1 ? "report" : "reports"}
                    </span>
                    {takenDown ? (
                      <span className="rounded-lg border border-edge px-2.5 py-1.5 text-[11px] text-muted">
                        Removed
                      </span>
                    ) : (
                      <form action={`/api/admin?key=${encodeURIComponent(adminKey)}`} method="POST">
                        <input type="hidden" name="listingId" value={listing.id} />
                        <button
                          type="submit"
                          className="rounded-lg bg-fg px-2.5 py-1.5 text-[11px] font-semibold text-bg-lift transition hover:opacity-90"
                        >
                          Take down
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                <ul className="mt-3 space-y-1.5 border-t border-edge pt-3">
                  {reports.map((r) => (
                    <li key={r.id} className="text-[12px] text-muted">
                      <span className="font-semibold text-fg">
                        {REASON_LABEL[r.reason] ?? r.reason}
                      </span>{" "}
                      <span className="tnum">{new Date(r.created_at).toLocaleString()}</span>
                      {r.note && (
                        <span className="mt-0.5 block text-[12px] text-fg/80">
                          &ldquo;{r.note}&rdquo;
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
