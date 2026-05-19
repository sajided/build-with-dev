"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type SessionStatus = "booting" | "ready";

const SessionReadyContext = createContext<boolean>(false);

export function useSessionReady() {
  return useContext(SessionReadyContext);
}

type UiState =
  | { overlay: null }
  | { overlay: "loading" }
  | { overlay: "error"; message: string };

function validateSupabaseEnv(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!url || !key) {
    return "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local — then restart `npm run dev`.";
  }
  if (
    url.includes("YOUR_PROJECT") ||
    key.includes("REPLACE_WITH_ANON") ||
    key.length < 20
  ) {
    return "Replace placeholder Supabase keys in .env.local with values from Supabase Dashboard → Settings → API. Restart `npm run dev`.";
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return `Invalid NEXT_PUBLIC_SUPABASE_URL protocol: "${url}".`;
    }
  } catch {
    return `Invalid NEXT_PUBLIC_SUPABASE_URL: "${url.slice(0, 48)}..."`;
  }
  return null;
}

function formatHelp(main: string, extras: string[]) {
  return ["Session bootstrap failed:", main, "", ...extras].join("\n");
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function EnsureSession({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<SessionStatus>("booting");
  const [ui, setUi] = useState<UiState>({ overlay: "loading" });

  const sessionReady = status === "ready";

  /** Attempts anon + optional dev-bootstrap; toggles overlay on failure. Returns whether a user session exists. */
  const establishSession = useCallback(async (): Promise<boolean> => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setUi({
        overlay: "error",
        message: formatHelp(msg, [
          "Ensure .env.local is valid and restart the dev server.",
        ]),
      });
      return false;
    }

    async function waitForAuth(): Promise<boolean> {
      for (let i = 0; i < 12; i++) {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) return true;
        } catch {
          /* retry */
        }
        await sleep(50 * (i + 1));
      }
      return false;
    }

    const envErr = validateSupabaseEnv();
    if (envErr) {
      setUi({ overlay: "error", message: envErr });
      return false;
    }

    try {
      const {
        data: { user: initialUser },
      } = await supabase.auth.getUser();

      if (initialUser) {
        return true;
      }

      let anonMsg = "";
      try {
        const anon = await supabase.auth.signInAnonymously();
        if (!anon.error && (await waitForAuth())) {
          return true;
        }
        anonMsg =
          anon.error?.message ??
          (!anon.error
            ? "Anonymous sign-in OK but session not detected (cookies?)."
            : "Anonymous sign-in failed.");
      } catch (e) {
        anonMsg =
          e instanceof TypeError &&
          typeof e.message === "string" &&
          e.message.includes("Load failed")
            ? "Network load failed to Supabase (check NEXT_PUBLIC_SUPABASE_URL, HTTPS, offline, or blockers)."
            : e instanceof Error
              ? e.message
              : String(e);
      }

      try {
        const fb = await fetch("/api/auth/dev-bootstrap", {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const payload = await fb.json().catch(() => ({}));

        if (fb.ok && (await waitForAuth())) {
          return true;
        }

        const hint =
          typeof payload.hint === "string" ? payload.hint : undefined;

        setUi({
          overlay: "error",
          message: formatHelp(
            anonMsg ||
              (typeof payload.error === "string"
                ? String(payload.error)
                : ""),
            [
              "Option A · Supabase → Authentication → Providers → Anonymous → enable.",
              "",
              "Option B · .env.local: DEV_AUTO_EMAIL / DEV_AUTO_PASSWORD matching a Dashboard user.",
              ...(fb.status === 403
                ? [`(HTTP ${403}; bootstrap disabled or credentials missing)`]
                : []),
              ...(hint ? [hint] : []),
            ],
          ),
        });
      } catch (e) {
        const net =
          e instanceof TypeError
            ? `${e.message} — could not reach /api/auth/dev-bootstrap.`
            : String(e);
        setUi({
          overlay: "error",
          message: formatHelp(`${anonMsg}\n\nThen: ${net}`, [
            "Option A · Enable Anonymous auth in Supabase.",
            "Option B · Configure DEV_AUTO_EMAIL / DEV_AUTO_PASSWORD.",
          ]),
        });
      }
    } catch (e) {
      setUi({
        overlay: "error",
        message: formatHelp(e instanceof Error ? e.message : String(e), [
          "Check .env.local and Supabase API keys; restart `npm run dev`.",
        ]),
      });
    }

    return false;
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setUi({ overlay: "loading" });
      setStatus("booting");

      const ok = await establishSession();
      if (cancelled) return;

      if (ok) {
        setStatus("ready");
        setUi({ overlay: null });
        queueMicrotask(() => {
          router.refresh();
        });
        return;
      }

      /* Error UI already set by establishSession; keep status booting for context false */
      setStatus("booting");
    })();

    return () => {
      cancelled = true;
    };
  }, [establishSession, router]);

  const overlay = useMemo(() => {
    if (ui.overlay === null) return null;

    if (ui.overlay === "loading") {
      return (
        <div className="fixed inset-0 z-[200] flex cursor-wait touch-none items-center justify-center bg-bg label text-[var(--neon)] px-8 text-center select-none pointer-events-auto">
          SYNCING SESSION…
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[300] bg-bg px-8 py-16 overflow-auto flex items-start justify-center">
        <pre className="mt-24 text-left text-[var(--neon)] text-xs font-mono max-w-xl whitespace-pre-wrap leading-relaxed">
          {ui.message}
        </pre>
      </div>
    );
  }, [ui]);

  return (
    <SessionReadyContext.Provider value={sessionReady}>
      <div className="relative flex min-h-dvh flex-1 flex-col">
        {children}
        {overlay}
      </div>
    </SessionReadyContext.Provider>
  );
}
