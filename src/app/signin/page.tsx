import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/SignInForm";
import { currentEmail } from "@/lib/auth";
import { SITE } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: `Sign in — ${SITE.domain}` };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  // Only relative paths, so a crafted link cannot bounce someone off-site
  // after they sign in.
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (await currentEmail()) redirect(target);

  return (
    <main className="stage relative mx-auto w-full max-w-md px-5 py-16 sm:px-8">
      <Link href="/" className="relative z-10 text-sm text-muted hover:text-fg">
        ← back to the board
      </Link>

      <header className="relative z-10 mt-6 mb-8">
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Sign in</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          To claim a seat or manage one you already have.
        </p>
      </header>

      {/* The callback already redirects here with ?error=... when the code
          exchange fails, but nothing read it -- so a failed link dropped
          someone back onto a blank form with no explanation, which reads as a
          broken site rather than something to retry.

          The common cause is not an expired link: it is opening the mail on a
          different device or in a mail app's in-built browser, because the
          sign-in flow keeps its half of the exchange in the browser that
          asked for it. So the message leads with that. */}
      {error && (
        <div className="relative z-10 mb-5 rounded-2xl border border-gold-line bg-gold-soft p-4 card-shadow">
          <p className="text-[13px] font-semibold text-fg">
            {error === "missing" ? "That link was incomplete." : "That link didn't work."}
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            Usually this means it was opened somewhere other than the browser that
            asked for it &mdash; a mail app often opens links in its own. Request a new
            one below, then open it in this browser. Links also expire after an hour.
          </p>
        </div>
      )}

      <div className="relative z-10">
        <SignInForm next={target} />
      </div>
    </main>
  );
}
