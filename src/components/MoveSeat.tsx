"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROWS, rowOffset } from "@/lib/seating";

/**
 * Move to any seat nobody is sitting in.
 *
 * The whole house is drawn rather than a list of free numbers, because the
 * question people actually have is "where would I be sitting", and a row of
 * bare numbers cannot answer it.
 */
export function MoveSeat({
  token,
  current,
  taken,
}: {
  token: string;
  current: number | null;
  taken: number[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moved, setMoved] = useState<number | null>(null);

  const held = new Set(taken);

  async function move(seat: number) {
    setBusy(seat);
    setError(null);
    setMoved(null);

    const res = await fetch("/api/listing/seat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, seat }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);

    if (!res.ok) {
      setError(data.error ?? "Could not move your seat");
      // Somebody took it while the picker was open, so show that straight away.
      if (data.seatTaken) held.add(data.seatTaken);
      router.refresh();
      return;
    }

    setMoved(seat);
    router.refresh();
  }

  return (
    <section className="relative z-10 mb-8">
      <h2 className="mb-1 text-[13px] font-semibold text-fg">Move seat</h2>
      <p className="mb-3 text-[12px] leading-relaxed text-muted">
        Any seat that is not taken is yours for the asking, until midnight UTC.
      </p>

      <div className="rounded-2xl border border-edge bg-panel p-3">
        <div className="flex flex-col items-center gap-1.5">
          {ROWS.map((row, rowIndex) => {
            const offset = rowOffset(rowIndex);
            return (
              <div key={row.label} className="flex items-center justify-center gap-1.5">
                {Array.from({ length: row.seats }, (_, i) => {
                  // rowOffset is already the 1-based number of the row's first
                  // seat, so this is offset + i, not offset + i + 1.
                  const seat = offset + i;
                  const isCurrent = seat === current;
                  const isTaken = held.has(seat) && !isCurrent;
                  const isBusy = busy === seat;

                  return (
                    <button
                      key={seat}
                      type="button"
                      disabled={isTaken || isCurrent || busy !== null}
                      onClick={() => move(seat)}
                      title={
                        isCurrent
                          ? `Seat ${seat} — where you are now`
                          : isTaken
                            ? `Seat ${seat} — taken`
                            : `Move to seat ${seat}`
                      }
                      className={`tnum font-display flex size-7 items-center justify-center rounded-md text-[11px] transition-all duration-150 ${
                        isCurrent
                          ? "bg-gold text-[#141413] ring-2 ring-gold"
                          : isTaken
                            ? "cursor-not-allowed bg-faint text-muted/35 ring-1 ring-edge"
                            : "bg-faint text-muted ring-1 ring-edge hover:-translate-y-0.5 hover:bg-gold hover:text-[#141413] hover:ring-transparent"
                      } ${isBusy ? "opacity-50" : ""}`}
                    >
                      {seat}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm bg-gold" /> you
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm bg-faint ring-1 ring-edge" /> free
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm bg-faint ring-1 ring-edge opacity-40" />{" "}
            taken
          </span>
        </p>
      </div>

      {error && <p className="mt-2 text-[12px] text-red">{error}</p>}
      {moved && (
        <p className="mt-2 text-[12px] text-green">
          Moved to seat {moved}.
        </p>
      )}
    </section>
  );
}
