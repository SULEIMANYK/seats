import Link from "next/link";
import { MySeats } from "@/components/MySeats";
import { SITE } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `Your listings — ${SITE.domain}`,
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return (
    <main className="stage relative mx-auto w-full max-w-lg px-5 py-14 sm:px-8">
      <Link href="/" className="relative z-10 text-sm text-muted hover:text-fg">
        ← back to the board
      </Link>

      <header className="relative z-10 mt-6 mb-8">
        <h1 className="text-2xl sm:text-3xl">Your listings</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Kept in this browser, not in an account &mdash; there is nothing to sign in to.
          Your manage link is what actually controls a listing, so keep it.
        </p>
      </header>

      <div className="relative z-10">
        <MySeats />
      </div>
    </main>
  );
}
