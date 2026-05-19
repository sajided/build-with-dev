import type { DayRow } from "@/lib/types";

export function ThermalReceipt({
  date,
  day,
}: {
  date: string;
  day: DayRow | null;
}) {
  const receipt =
    day?.receipt_data && typeof day.receipt_data === "object"
      ? (day.receipt_data as {
          adventureStatus?: string;
          focusedMinutes?: number;
          sideQuests?: unknown;
          signOff?: string;
        })
      : null;

  const sideQuestsFromReceipt = receipt?.sideQuests;
  const sideQuests: string[] = Array.isArray(sideQuestsFromReceipt)
    ? (sideQuestsFromReceipt.filter((x) => typeof x === "string") as string[])
    : Array.isArray(day?.side_quests)
      ? ((day.side_quests as unknown[]).filter(
          (x): x is string => typeof x === "string",
        ) as string[])
      : [];

  const adventureDone =
    receipt?.adventureStatus === "SUCCESS" ? "SUCCESS" : "SKIPPED";

  const focused = receipt?.focusedMinutes ?? 0;
  const signOff = receipt?.signOff ?? day?.coaching_message ?? "—";

  return (
    <div className="max-w-sm mx-auto border-2 border-dashed border-text p-8 bg-black text-text font-mono text-xs leading-relaxed">
      <p className="text-center label text-[var(--neon)] mb-6">VibeTime · Day Receipt</p>
      <p className="text-center mb-6">{date}</p>
      <div className="border-t border-dotted border-text my-4" />
      <div className="flex justify-between">
        <span>Daily Adventure</span>
        <span>{adventureDone}</span>
      </div>
      <div className="mt-4">
        <p className="label mb-2">Side Quests</p>
        <ul className="space-y-2">
          {sideQuests.map((q) => (
            <li key={q} className="flex gap-2">
              <span className="text-[var(--neon)]">▢</span>
              <span>{q}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-dotted border-text my-4" />
      <div className="flex justify-between">
        <span>Focused Minutes</span>
        <span>{focused}</span>
      </div>
      <div className="border-t border-dotted border-text my-4" />
      <p className="text-[11px] leading-6 text-text/80 whitespace-pre-wrap">
        {signOff}
      </p>
      <div className="border-t border-dotted border-text my-4" />
      <p className="text-center text-[10px] text-text/50">THANK YOU FOR SHOWING UP</p>
    </div>
  );
}
