"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { forgetMine, readMine, type Mine } from "@/lib/mine";

type Row = Mine & { live: boolean; seat: number | null; today: boolean };

/**
 * Everything this browser has claimed, and a one-click way back on today's
 * board. The nightly clear is only survivable if returning is one click.
 */
export function MySeats() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const mine = readMine();
    if (mine.length === 0) return setRows([]);

    const res = await fetch("/api/mine", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tokens: mine.map((m) => m.token) }),
    });
    if (!res.ok) return setRows(mine.map((m) => ({ ...m, live: false, seat: null, today: false })));

    const data: { listings: { token: string; name: string; seat: number | null; today: boolean }[] } =
      await res.json();
    const byToken = new Map(data.listings.map((l) => [l.token, l]));

    setRows(
      mine.map((m) => {
        const found = byToken.get(m.token);
        return {
          ...m,
          name: found?.name ?? m.name,
          live: !!found,
          seat: found?.seat ?? null,
          today: found?.today ?? false,
        };
      }),
    );
  }

  useEffect(() => {
    load().catch(() => setRows([]));
  }, []);

  async function claimAgain(token: string) {
    setBusy(token);
    setError(null);
    const res = await fetch("/api/reclaim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);

    if (!res.ok) return setError(data.error ?? "Could not claim a seat");
    window.location.href = `/manage/${data.manageToken}`;
  }

  if (rows === null) {
    return <p className="text-[13px] text-muted">Looking…</p>;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-edge-strong/60 p-10 text-center">
        <p className="text-[15px] font-semibold">Nothing here yet.</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Seats you claim in this browser show up here, with a button to take one again
          after the nightly clear.
        </p>
        <Link
          href="/submit"
          className="pill mt-5 inline-block bg-gold px-5 py-2 text-[13px] font-semibold text-[#141413]"
        >
          Take a seat — free
        </Link>
      </div>
    );
  }

  const onBoard = rows.filter((r) => r.today);
  const past = rows.filter((r) => !r.today);

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-xl border border-gold-line bg-gold-soft px-3.5 py-2.5 text-[13px] text-gold">
          {error}
        </p>
      )}

      {onBoard.length > 0 && (
        <section>
          <h2 className="mb-2 text-[11px] tracking-wide text-muted uppercase">On the board today</h2>
          <ul className="space-y-2">
            {onBoard.map((r) => (
              <li
                key={r.token}
                className="flex items-center justify-between gap-3 rounded-2xl border border-gold-line bg-gold-soft p-4 card-shadow"
              >
                <span className="flex min-w-0 items-baseline gap-2.5">
                  <span className="tnum font-display shrink-0 text-2xl text-gold">
                    {r.seat ?? "—"}
                  </span>
                  <span className="truncate text-[14px] font-semibold">{r.name}</span>
                </span>
                <Link
                  href={`/manage/${r.token}`}
                  className="shrink-0 rounded-lg border border-edge bg-panel px-3 py-1.5 text-[12px] font-semibold"
                >
                  Manage
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-2 text-[11px] tracking-wide text-muted uppercase">Earlier days</h2>
          <ul className="space-y-2">
            {past.map((r) => (
              <li
                key={r.token}
                className="flex items-center justify-between gap-3 rounded-2xl border border-edge bg-panel p-4"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold">{r.name}</span>
                  <span className="block text-[11px] text-muted">
                    {r.live ? "not on today's board" : "no longer listed"}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-2">
                  {r.live && (
                    <button
                      onClick={() => claimAgain(r.token)}
                      disabled={busy !== null}
                      className="pill bg-gold px-4 py-1.5 text-[12px] font-semibold text-[#141413] disabled:opacity-50"
                    >
                      {busy === r.token ? "Claiming…" : "Claim again"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      forgetMine(r.token);
                      setRows((rs) => (rs ?? []).filter((x) => x.token !== r.token));
                    }}
                    title="Remove from this list"
                    className="rounded-lg border border-edge px-2.5 py-1.5 text-[12px] text-muted"
                  >
                    Hide
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
