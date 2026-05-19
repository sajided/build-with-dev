"use client";

import type { BlockRow, ThreePs } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

export const DAY_START_MIN = 6 * 60;
export const DAY_END_MIN = 22 * 60;
export const RANGE_MIN = DAY_END_MIN - DAY_START_MIN;

export function BlockCard({
  block,
  onStuck,
  onStartWork,
}: {
  block: BlockRow;
  onStuck?: () => void;
  onStartWork?: () => void;
}) {
  const [updating, setUpdating] = useState(false);

  const startMin = blockClockToMinutes(block.start_time);
  const endMin = blockClockToMinutes(block.end_time);

  if (startMin === null || endMin === null || endMin <= startMin) {
    return (
      <div
        style={{ top: "0%", height: "auto", minHeight: "4rem" }}
        className="absolute inset-x-0 border-2 border-red-400/70 bg-black/95 px-3 py-2 z-10 flex flex-col gap-2 overflow-hidden text-[11px] font-mono text-red-400/90"
      >
        <p className="label text-white uppercase">
          Thermal grid placement error
        </p>
        <p>
          Could not interpret times for &quot;{block.task_name}&quot;. Raw start{" "}
          <code className="text-white">{String(block.start_time)}</code>, end{" "}
          <code className="text-white">{String(block.end_time)}</code>.
        </p>
      </div>
    );
  }

  const topPct = Math.max(((startMin - DAY_START_MIN) / RANGE_MIN) * 100, 0);
  const heightPct = Math.max(((endMin - startMin) / RANGE_MIN) * 100, 2);

  /** Entire block starts after the visible day window ends (22:00). */
  if (topPct >= 100 || startMin >= DAY_END_MIN) return null;

  const statusColor =
    block.status === "completed"
      ? "border-[var(--neon)]"
      : block.status === "skipped"
        ? "border-text text-text"
        : "border-text";

  async function toggleStatus() {
    const next =
      block.status === "completed" ? "pending" : "completed";
    try {
      setUpdating(true);
      const { createClient } = await import("@/lib/supabase/client");
      const client = createClient();
      await client.from("blocks").update({ status: next }).eq("id", block.id);
    } finally {
      setUpdating(false);
    }
  }

  function shouldGateThreePs() {
    if (block.type !== "work") return false;
    return !hasThree(block.three_ps);
  }

  return (
    <div
      style={{ top: `${topPct}%`, height: `${heightPct}%` }}
      className={`absolute inset-x-0 border-2 ${statusColor} bg-black/95 px-3 py-2 flex flex-col gap-3 overflow-hidden`}
    >
      <div className="flex justify-between gap-2">
        <div>
          <p className="text-xs label text-[var(--neon)]">{block.type}</p>
          <p className="font-mono text-xs leading-snug">{block.task_name}</p>
          <p className="text-[11px] text-text/60 mt-2">
            {formatBlockHm(block.start_time)} → {formatBlockHm(block.end_time)} ·{" "}
            <span className="uppercase tracking-wider">{block.status}</span>
          </p>
        </div>
        <div className="flex flex-col gap-2 items-end text-[11px]">
          <button
            type="button"
            disabled={updating}
            className="brutalist-btn px-2 py-1"
            onClick={() => toggleStatus()}
          >
            {block.status === "completed" ? "UNMARK" : "DONE"}
          </button>
          {block.status === "pending" && (
            <>
              <Link
                className="brutalist-btn px-2 py-1 inline-block text-center"
                href={`/adventure/${block.id}`}
                onClick={(e) => {
                  if (shouldGateThreePs()) {
                    e.preventDefault();
                    onStartWork?.();
                  }
                }}
              >
                ADVENTURE MODE
              </Link>
              <button
                type="button"
                className="brutalist-btn px-2 py-1"
                onClick={onStuck}
              >
                STUCK
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function hoursTickList() {
  const hs: number[] = [];
  for (let h = 6; h <= 22; h++) hs.push(h);
  return hs;
}

function hasThree(tp: ThreePs | null | undefined) {
  return !!tp?.play?.trim() && !!tp?.power?.trim() && !!tp?.people?.trim();
}


/** Short display HH:mm derived from Postgres time / ISO-ish strings */
function formatBlockHm(raw: string | null | undefined): string {
  if (!raw) return "??:??";
  const z = raw.trim();
  const isoHm = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2})?/.exec(z);
  if (isoHm) return isoHm[2];
  return z.slice(0, 5).length === 5 && z.includes(":")
    ? z.slice(0, 5)
    : "??:??";
}

function hhmmToMinutes(hhmm: string): number | null {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/** Parses Postgres `time` / `HH:mm` / ISO datetime time component. */
function blockClockToMinutes(raw: string | null | undefined): number | null {
  if (!raw || typeof raw !== "string") return null;
  const z = raw.trim();
  const isoHm = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?/.exec(z);
  if (isoHm) return hhmmToMinutes(isoHm[2]);
  if (/^\d{4}-\d{2}-\d/.test(z)) return null;
  if (/^\d{2}:\d{2}/.test(z)) return hhmmToMinutes(z.slice(0, 5));
  return null;
}
