import Link from "next/link";
import { SITE } from "@/lib/config";

export const metadata = { title: `Privacy — ${SITE.domain}` };

export default function PrivacyPage() {
  return (
    <main className="stage relative mx-auto w-full max-w-2xl px-5 py-14 sm:px-8">
      <Link href="/" className="relative z-10 text-sm text-muted hover:text-fg">
        ← back to the board
      </Link>
      <h1 className="relative z-10 mt-6 text-4xl">Privacy</h1>

      <div className="relative z-10 mt-6 space-y-5 text-[15px] leading-relaxed text-muted">
        <p>
          Short, because {SITE.domain} collects very little. There are no accounts and no
          third-party analytics.
        </p>

        <div>
          <h2 className="text-[16px]">What is stored</h2>
          <p className="mt-1.5">
            What you type into the listing form: name, URL, tagline, category, and optionally a
            logo and an email address. The email is optional and is used only to send your manage
            link again if you lose it.
          </p>
        </div>

        <div>
          <h2 className="text-[16px]">Visits and clicks</h2>
          <p className="mt-1.5">
            Page visits and outbound clicks are counted so listings can show a click count. IP
            addresses are hashed with a secret before being stored and are used only to rate-limit
            abuse. The raw address is never written down.
          </p>
        </div>

        <div>
          <h2 className="text-[16px]">Your browser</h2>
          <p className="mt-1.5">
            Your manage links are kept in your own browser&apos;s local storage so &ldquo;your
            listings&rdquo; works without an account. That never leaves your device except when
            you ask the site to look one up.
          </p>
        </div>

        <div>
          <h2 className="text-[16px]">Payments</h2>
          <p className="mt-1.5">
            Dodo Payments handles payments as merchant of record and collects whatever it needs
            for that, under its own privacy policy. {SITE.domain} receives the amount, a payment
            reference, and the email you gave at checkout &mdash; never card details.
          </p>
        </div>

        <div>
          <h2 className="text-[16px]">Removal</h2>
          <p className="mt-1.5">
            Delete your listing with your manage link and the listing is taken off the board.
            Click counts and payment records are kept, because they are the record of money that
            changed hands.
          </p>
        </div>
      </div>
    </main>
  );
}
