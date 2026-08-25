import { currentEmail } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Resolve a listing the caller is allowed to act on.
 *
 * Authorised two ways, because both are legitimate: a signed-in owner, or
 * the manage token. The token predates sign-in and people saved those links,
 * so dropping it would lock them out of listings they own.
 *
 * Shared by every route that mutates a listing, so the rule is written once.
 */
export async function authoriseListing(
  token: string | undefined,
  listingId: string | undefined,
) {
  const supabase = db();
  const owner = await currentEmail();

  const query = supabase.from("listings").select("*");
  const { data } = token
    ? await query.eq("manage_token", token).maybeSingle()
    : await query.eq("id", listingId ?? "").maybeSingle();

  if (!data) return { listing: null, supabase };
  if (token) return { listing: data, supabase };
  // Without a token, the caller must be signed in as the owner.
  if (owner && data.owner_email === owner) return { listing: data, supabase };
  return { listing: null, supabase };
}
