import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Accepts an image and returns a public URL.
 *
 * The file is checked here rather than trusted from the client: the browser's
 * accept attribute is a hint, not a control, and the declared content type is
 * whatever the uploader says it is. So the bytes are sniffed for a real image
 * signature before anything is stored.
 */

const MAX_BYTES = 2 * 1024 * 1024;

const TYPES: Record<string, { ext: string; magic: (b: Uint8Array) => boolean }> = {
  "image/png": { ext: "png", magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/webp": {
    ext: "webp",
    magic: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  "image/gif": { ext: "gif", magic: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
};

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a file upload" }, { status: 400 });
  }

  const file = form.get("file");
  const kind = form.get("kind") === "screenshot" ? "screenshot" : "logo";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Images must be 2 MB or smaller" }, { status: 413 });
  }

  const spec = TYPES[file.type];
  if (!spec) {
    return NextResponse.json(
      { error: "Use a PNG, JPEG, WebP or GIF" },
      { status: 415 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  // SVG is deliberately absent from TYPES: it can carry script, and a public
  // bucket serving it means anything embedded runs on our origin.
  if (!spec.magic(bytes)) {
    return NextResponse.json(
      { error: "That file doesn't look like the image type it claims to be" },
      { status: 415 },
    );
  }

  const path = `${kind}/${randomUUID()}.${spec.ext}`;

  const { error } = await db()
    .storage.from("listing-images")
    .upload(path, bytes, { contentType: file.type, cacheControl: "31536000" });

  if (error) {
    console.error("upload failed", error);
    return NextResponse.json({ error: "Could not store that image" }, { status: 500 });
  }

  const { data } = db().storage.from("listing-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
