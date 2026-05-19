import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Use in Route Handlers / Server Actions where cookies must be written.
 * Do not swallow cookie set failures (unlike Server Components helper).
 */
export async function createSupabaseRouteClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "https://YOUR_PROJECT.supabase.co";
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "REPLACE_WITH_ANON_KEY";

  const cookieStore = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: readonly {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[],
      ) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(
            name,
            value,
            options as Parameters<typeof cookieStore.set>[2],
          ),
        );
      },
    },
  });
}
