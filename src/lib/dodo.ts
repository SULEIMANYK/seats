/**
 * Dodo Payments.
 *
 * Only the hosted checkout is used: we hand Dodo a product and a return URL
 * and send the buyer to their page. Card details, billing addresses and tax
 * handling stay entirely on their side, which is the whole reason to use a
 * merchant of record rather than collecting any of it here.
 */

const BASE =
  process.env.DODO_SERVER === "test"
    ? "https://test.dodopayments.com"
    : "https://live.dodopayments.com";

export const FEATURED_PRODUCT_ID = process.env.DODO_FEATURED_PRODUCT_ID ?? "";

export function dodoConfigured(): boolean {
  return !!process.env.DODO_API_KEY && !!FEATURED_PRODUCT_ID;
}

export type CheckoutResult =
  | { ok: true; url: string; sessionId: string | null }
  | { ok: false; error: string; status: number };

/**
 * Open a hosted checkout for one domain's featured placement.
 *
 * The domain travels in metadata rather than in the return URL, because the
 * return URL is under the buyer's control once they are on it and the webhook
 * is what actually grants the placement.
 */
export async function createFeaturedCheckout(opts: {
  domain: string;
  returnUrl: string;
}): Promise<CheckoutResult> {
  const key = process.env.DODO_API_KEY;
  if (!key || !FEATURED_PRODUCT_ID) {
    return { ok: false, error: "Payments are not configured.", status: 503 };
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}/checkouts`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        product_cart: [{ product_id: FEATURED_PRODUCT_ID, quantity: 1 }],
        return_url: opts.returnUrl,
        metadata: { domain: opts.domain },
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return { ok: false, error: "Could not reach the payment provider.", status: 502 };
  }

  const body: unknown = await res.json().catch(() => null);
  const data = (body ?? {}) as Record<string, unknown>;

  if (!res.ok) {
    const message = typeof data.message === "string" ? data.message : "Checkout failed";
    // Surfaced verbatim in the log because the useful ones are specific --
    // "Live payments not enabled for merchant" is an account state, not a bug.
    console.error("dodo checkout failed", res.status, message);
    return { ok: false, error: message, status: 502 };
  }

  const url =
    (typeof data.checkout_url === "string" && data.checkout_url) ||
    (typeof data.payment_link === "string" && data.payment_link) ||
    (typeof data.url === "string" && data.url) ||
    null;

  if (!url) {
    console.error("dodo checkout returned no url", JSON.stringify(data).slice(0, 300));
    return { ok: false, error: "Payment provider returned no checkout link.", status: 502 };
  }

  const sessionId =
    (typeof data.session_id === "string" && data.session_id) ||
    (typeof data.payment_id === "string" && data.payment_id) ||
    null;

  return { ok: true, url, sessionId };
}
