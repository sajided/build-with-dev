import type { BlockRow } from "@/lib/types";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

export function ThreePsModal({
  block,
  open,
  setOpen,
  onSaved,
}: {
  block: BlockRow | null;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  onSaved?: (blockId: string) => void;
}) {
  if (!open || !block) return null;

  return (
    <ThreePsModalInner
      key={block.id}
      block={block}
      setOpen={setOpen}
      onSaved={onSaved}
    />
  );
}

function ThreePsModalInner({
  block,
  setOpen,
  onSaved,
}: {
  block: BlockRow;
  setOpen: Dispatch<SetStateAction<boolean>>;
  onSaved?: (blockId: string) => void;
}) {
  const [play, setPlay] = useState(() => block.three_ps?.play ?? "");
  const [power, setPower] = useState(() => block.three_ps?.power ?? "");
  const [people, setPeople] = useState(() => block.three_ps?.people ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    const targetBlock = block;
    setBusy(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase
        .from("blocks")
        .update({ three_ps: { play, power, people } })
        .eq("id", targetBlock.id);
      onSaved?.(targetBlock.id);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-center px-6">
      <div className="border-2 border-[var(--neon)] max-w-xl mx-auto w-full px-8 py-10 gap-8 flex flex-col bg-black">
        <header className="label text-[var(--neon)] flex justify-between">
          Preflight · 3P Checklist
          <button
            type="button"
            className="text-[10px] border border-text px-2 py-1"
            onClick={() => setOpen(false)}
          >
            CLOSE
          </button>
        </header>

        <p className="text-xs font-mono text-text/70">{block.task_name}</p>

        <label className="flex flex-col gap-2 label text-text">
          Play (make it engaging)
          <textarea
            className="brutalist-input min-h-[64px]"
            value={play}
            onChange={(e) => setPlay(e.target.value)}
            placeholder="Synthwave playlist, tactile keyboard, ..."
          />
        </label>

        <label className="flex flex-col gap-2 label">
          Power (something you completely control)
          <textarea
            className="brutalist-input min-h-[64px]"
            value={power}
            onChange={(e) => setPower(e.target.value)}
            placeholder="File naming scheme, scaffold order, ..."
          />
        </label>

        <label className="flex flex-col gap-2 label">
          People (loop someone in afterward)
          <textarea
            className="brutalist-input min-h-[64px]"
            value={people}
            onChange={(e) => setPeople(e.target.value)}
          />
        </label>

        <button
          type="button"
          disabled={busy}
          className="brutalist-btn border-[var(--neon)] text-[var(--neon)]"
          onClick={() => void save()}
        >
          SAVE & READY
        </button>
      </div>
    </div>
  );
}
