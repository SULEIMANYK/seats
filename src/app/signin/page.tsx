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
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
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

      <div className="relative z-10">
        <SignInForm next={target} />
      </div>
    </main>
  );
}
