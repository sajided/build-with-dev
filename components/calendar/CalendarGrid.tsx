"use client";

import type { BlockRow } from "@/lib/types";
import { BlockCard, hoursTickList } from "@/components/calendar/BlockCard";

export function CalendarGrid({
  blocks,
  onStuck,
  onStartWorkAdventure,
  dayPriorityFlag,
}: {
  blocks: BlockRow[];
  onStuck?: (block: BlockRow) => void;
  onStartWorkAdventure?: (block: BlockRow) => void;
  dayPriorityFlag: string | null;
}) {
  return (
    <section className="flex flex-col border-2 border-text h-full min-h-0">
      <header className="shrink-0 label border-b-2 border-text px-4 py-3 flex justify-between items-center gap-4">
        <span>Thermal Grid</span>
        <span className="text-[var(--neon)] truncate max-w-[60%] text-right leading-tight">
          {dayPriorityFlag ?? ""}
        </span>
      </header>
      <div className="relative flex-1 min-h-0 px-14 py-4 bg-black overflow-y-auto">
        <div className="absolute left-2 top-4 bottom-4 w-10 flex flex-col justify-between border-r-2 border-text/60 pr-2 py-2 text-[10px] text-text/60 uppercase">
          {hoursTickList().map((h) => (
            <div key={h} className="text-right leading-none shrink-0">
              {String(h).padStart(2, "0")}
            </div>
          ))}
        </div>
        <div className="relative min-h-[960px] border-l border-dashed border-text/30">
          {blocks.length === 0 ? (
            <div className="absolute inset-x-2 top-[15%] border-2 border-dashed border-text/40 px-4 py-6 text-[11px] text-text/60 uppercase font-mono">
              No blocks yet. Message the coach to lock today&apos;s agenda (complete
              schedule). Failed coach calls won&apos;t add blocks — check errors above or
              the console.
            </div>
          ) : (
            blocks.map((b) => (
              <BlockCard
                key={b.id}
                block={b}
                onStuck={() => onStuck?.(b)}
                onStartWork={() => onStartWorkAdventure?.(b)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
