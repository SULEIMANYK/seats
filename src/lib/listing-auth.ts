import { db } from "@/lib/db";

/**
 * Resolve a listing the caller is allowed to act on.
 *
 * The manage token is the only credential this site issues. There are no
 * accounts, so holding the token is the whole claim: it is handed out once,
 * at the moment the listing is created, and never shown anywhere else.
 */
export async function authoriseListing(token: string | undefined) {
  const supabase = db();
  if (!token) return { listing: null, supabase };

  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("manage_token", token)
    .maybeSingle();

  return { listing: data ?? null, supabase };
}
