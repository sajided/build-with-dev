"use client";

import type { BlockRow } from "@/lib/types";
import {
  BlockCard,
  hoursTickList,
  RANGE_MIN,
} from "@/components/calendar/BlockCard";

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
    <section className="flex flex-col border-2 border-text h-full min-h-[460px]">
      <header className="label border-b-2 border-text px-4 py-3 flex justify-between items-center gap-4">
        <span>Thermal Grid</span>
        <span className="text-[var(--neon)] truncate max-w-[60%] text-right leading-tight">
          {dayPriorityFlag ?? ""}
        </span>
      </header>
      <div className="relative flex-1 px-14 py-4 bg-black overflow-y-auto">
        <div className="absolute left-2 top-4 bottom-4 w-10 flex flex-col border-r-2 border-text/60 pr-2 text-[10px] text-text/60 uppercase">
          {hoursTickList().map((h) => (
            <div
              key={h}
              className="relative text-right"
              style={{ height: `${(60 / RANGE_MIN) * 100}%` }}
            >
              {String(h).padStart(2, "0")}
            </div>
          ))}
        </div>
        <div className="relative min-h-[1400px] border-l border-dashed border-text/30">
          {blocks.map((b) => (
            <BlockCard
              key={b.id}
              block={b}
              onStuck={() => onStuck?.(b)}
              onStartWork={() => onStartWorkAdventure?.(b)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
