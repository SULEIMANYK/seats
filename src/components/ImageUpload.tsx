"use client";

import { useRef, useState } from "react";

/**
 * A file picker that uploads immediately and reports back a URL.
 *
 * Uploading on selection rather than on submit means the slow part happens
 * while the person is still filling in the form, and a rejected file is
 * caught then rather than after they hit the button.
 */
export function ImageUpload({
  kind,
  label,
  hint,
  aspect,
  onUploaded,
}: {
  kind: "logo" | "screenshot";
  label: string;
  hint: string;
  aspect: string;
  onUploaded: (url: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);

    // Show it straight away; the upload can catch up.
    const local = URL.createObjectURL(file);
    setPreview(local);

    const body = new FormData();
    body.append("file", file);
    body.append("kind", kind);

    try {
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        setPreview(null);
        onUploaded(null);
      } else {
        onUploaded(data.url);
      }
    } catch {
      setError("Upload failed — check your connection");
      setPreview(null);
      onUploaded(null);
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setPreview(null);
    setError(null);
    onUploaded(null);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-[11px] font-semibold tracking-wide text-muted uppercase">
        {label}
      </span>

      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {preview ? (
        <div className="flex items-center gap-3 rounded-xl border border-edge bg-bg-lift p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className={`shrink-0 rounded-lg bg-bg object-cover ring-1 ring-edge ${aspect}`}
          />
          <span className="flex-1 text-[12px] text-muted">
            {busy ? "Uploading…" : "Ready"}
          </span>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 rounded-lg border border-edge px-2.5 py-1.5 text-[12px] text-muted transition hover:border-edge-strong hover:text-fg"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="w-full rounded-xl border border-dashed border-edge-strong/70 bg-bg-lift px-3.5 py-4 text-left transition hover:border-accent hover:bg-panel"
        >
          <span className="block text-[13px] font-medium">Choose an image</span>
          <span className="mt-0.5 block text-[11px] text-muted">{hint}</span>
        </button>
      )}

      {error && <p className="text-[11px] text-gold">{error}</p>}
    </div>
  );
}
