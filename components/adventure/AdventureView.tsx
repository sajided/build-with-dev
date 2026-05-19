"use client";

import { MicroAction } from "@/components/adventure/MicroAction";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { BlockRow } from "@/lib/types";

export function AdventureView({ initialBlock }: { initialBlock: BlockRow }) {
  const [busy, setBusy] = useState(false);
  const [microActions, setMicroActions] = useState<string[]>(
    Array.isArray(initialBlock.micro_actions)
      ? (initialBlock.micro_actions as string[])
      : [],
  );
  const [error, setError] = useState<string | null>(null);

  const instructions = useMemo(
    () => initialBlock.task_name,
    [initialBlock.task_name],
  );

  async function makeSmaller() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId: initialBlock.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Breakdown failed");
      }
      setMicroActions(Array.isArray(data.microActions) ? data.microActions : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bg text-text px-8 py-12 flex flex-col gap-12 max-w-3xl mx-auto">
      <div className="flex justify-between items-center">
        <Link href="/today" className="label underline text-[var(--neon)]">
          ← TODAY
        </Link>
      </div>
      <div>
        <p className="label text-[var(--neon)] mb-6">Adventure Mode</p>
        <h1 className="text-xl font-semibold leading-relaxed">{instructions}</h1>
        <p className="text-xs text-white/70 mt-4">
          {initialBlock.start_time.slice(0, 5)} – {initialBlock.end_time.slice(0, 5)}
        </p>
      </div>
      <button
        type="button"
        disabled={busy}
        className="brutalist-btn border-[var(--neon)] text-[var(--neon)] self-start"
        onClick={() => makeSmaller()}
      >
        {busy ? "CONSULTING COACH..." : "MAKE IT SMALLER"}
      </button>
      {error && (
        <p className="text-xs text-[var(--neon)] font-mono uppercase">{error}</p>
      )}
      {microActions.length > 0 && (
        <ul className="space-y-4">
          <p className="label mb-4">Atomic Stack</p>
          {microActions.map((micro, idx) => (
            <MicroAction key={micro + idx} text={micro} index={idx + 1} />
          ))}
        </ul>
      )}
    </div>
  );
}
