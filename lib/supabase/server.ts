import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function supabaseCredentials() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "https://YOUR_PROJECT.supabase.co";
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "REPLACE_WITH_ANON_KEY";
  return { url, anon };
}

export async function createClient() {
  const { url, anon } = supabaseCredentials();
  const cookieStore = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: readonly { name: string; value: string; options?: Record<string, unknown> }[],
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Partial<{ path?: string; maxAge?: number; expires?: Date; secure?: boolean; httpOnly?: boolean; sameSite?: "lax" | "strict" | "none" }>),
          );
        } catch {
          /* Server Components — cookies not mutable here */
        }
      },
    },
  });
}
