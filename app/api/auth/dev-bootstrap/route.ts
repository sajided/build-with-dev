import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route-handler";

/**
 * Cookie-based email/password session (no login UI).
 * In production, requires ALLOW_DEV_AUTH_BOOTSTRAP=1 explicitly.
 * In development, enabled automatically when DEV_AUTO_EMAIL + DEV_AUTO_PASSWORD exist.
 */
function allowPasswordBootstrap(): boolean {
  const explicitAllow =
    process.env.ALLOW_DEV_AUTH_BOOTSTRAP === "1" ||
    process.env.ALLOW_DEV_AUTH_BOOTSTRAP === "true";

  const isDevelopment = process.env.NODE_ENV === "development";
  const hasCreds =
    Boolean(process.env.DEV_AUTO_EMAIL?.trim()) &&
    Boolean(process.env.DEV_AUTO_PASSWORD);

  return explicitAllow || (Boolean(isDevelopment) && Boolean(hasCreds));
}

export async function POST() {
  if (!allowPasswordBootstrap()) {
    return NextResponse.json(
      {
        ok: false,
        error: "disabled",
        hint:
          "Set DEV_AUTO_EMAIL + DEV_AUTO_PASSWORD in .env.local (dev auto-enables). For production use ALLOW_DEV_AUTH_BOOTSTRAP=1 or enable Anonymous sign-ins in Supabase.",
      },
      { status: 403 },
    );
  }

  const email = process.env.DEV_AUTO_EMAIL?.trim();
  const password = process.env.DEV_AUTO_PASSWORD ?? "";
  if (!email || !password) {
    return NextResponse.json(
      {
        ok: false,
        error: "misconfigured_env",
        hint: "DEV_AUTO_EMAIL and DEV_AUTO_PASSWORD must be set.",
      },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseRouteClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        hint:
          "Check the user exists in Supabase Authentication and Email provider is enabled.",
      },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true });
}
