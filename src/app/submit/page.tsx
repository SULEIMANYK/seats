import Link from "next/link";
import { SubmitForm } from "@/components/SubmitForm";
import { SITE } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url: urlParam } = await searchParams;

  return (
    <main className="stage relative mx-auto w-full max-w-5xl px-4 pt-14 pb-24 sm:px-6">
      <Link href="/" className="relative z-10 text-sm text-muted transition hover:text-fg">
        ← back to the board
      </Link>

      <header className="relative z-10 mt-6 mb-8">
        <h1 className="text-2xl sm:text-3xl">Get listed</h1>
        <p className="mt-2.5 max-w-lg text-[14px] leading-relaxed text-muted">
          Adding your listing is free. Where it sits is not &mdash; the board is ordered by what
          each listing has paid, so you place a bid once you are on it.
        </p>
      </header>

      <SubmitForm initialUrl={urlParam ?? ""} />
    </main>
  );
}
