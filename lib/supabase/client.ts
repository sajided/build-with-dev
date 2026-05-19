import { createBrowserClient } from "@supabase/ssr";

const fallbackUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://YOUR_PROJECT.supabase.co";
const fallbackKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "REPLACE_WITH_ANON_KEY";

export function createClient() {
  return createBrowserClient(fallbackUrl, fallbackKey);
}
