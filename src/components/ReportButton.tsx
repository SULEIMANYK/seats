"use client";

import { useState } from "react";

const REASONS: { value: string; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "scam", label: "Scam" },
  { value: "broken", label: "Broken link" },
  { value: "nsfw", label: "NSFW" },
  { value: "other", label: "Other" },
];

type Status = "idle" | "open" | "sending" | "done";

/**
 * A quiet flag next to each listing, not a call to action. Abuse reporting
 * has to exist, but it should never out-compete the listing itself for
 * attention — that would make the board read as a moderation queue instead
 * of a leaderboard.
 *
 * Lives outside the row's own link so a button never nests inside an
 * anchor.
 */
export function ReportButton({ listingId }: { listingId: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [reason, setReason] = useState<string>("spam");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setStatus((s) => (s === "idle" ? "open" : "idle"));
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, reason, note: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not submit report");
        setStatus("open");
        return;
      }
      setStatus("done");
    } catch {
      setError("Could not submit report");
      setStatus("open");
    }
  }

  return (
    <div className="relative shrink-0 self-center">
      <button
        type="button"
        onClick={toggle}
        title="Report this listing"
        aria-label="Report this listing"
        className="rounded-full px-1.5 py-1 text-[13px] leading-none text-muted/40 transition hover:bg-faint hover:text-muted"
      >
        ⚑
      </button>

      {status !== "idle" && (
        <div className="absolute top-full right-0 z-20 mt-1 w-56 rounded-2xl border border-edge bg-panel p-3 card-shadow">
          {status === "done" ? (
            <p className="text-[12px] text-fg">Thanks — we&apos;ll take a look.</p>
          ) : (
            <form onSubmit={submit} className="space-y-2">
              <p className="text-[11px] font-semibold text-fg">Report this listing</p>

              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-edge bg-bg px-2 py-1.5 text-[12px] text-fg"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                placeholder="Details (optional)"
                rows={2}
                maxLength={500}
                className="w-full resize-none rounded-lg border border-edge bg-bg px-2 py-1.5 text-[12px] text-fg placeholder:text-muted/60"
              />

              {error && <p className="text-[11px] text-accent">{error}</p>}

              <div className="flex items-center justify-end gap-3 pt-0.5">
                <button
                  type="button"
                  onClick={toggle}
                  className="text-[11px] text-muted hover:text-fg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="rounded-lg bg-fg px-2.5 py-1 text-[11px] font-semibold text-bg-lift disabled:opacity-50"
                >
                  {status === "sending" ? "Sending…" : "Submit"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
