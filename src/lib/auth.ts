import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client bound to the request's cookies.
 *
 * This one runs as the signed-in user, unlike db() which uses the service
 * role. It exists only to answer "who is this?" — every write still goes
 * through db(), so RLS staying closed is not a problem.
 */
export async function authClient() {
  const store = await cookies();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;

  if (!url || !anon) throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");

  return createServerClient(url, anon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // middleware refreshes the session instead, so this is safe to skip.
        }
      },
    },
  });
}

/** The signed-in user's email, or null. */
export async function currentEmail(): Promise<string | null> {
  try {
    const { data } = await (await authClient()).auth.getUser();
    return data.user?.email?.toLowerCase() ?? null;
  } catch (err) {
    console.error("auth lookup failed", err);
    return null;
  }
}
