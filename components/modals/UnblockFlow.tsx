"use client";

import { Timer } from "@/components/ui/Timer";
import type { BlockRow } from "@/lib/types";
import type { Dispatch, SetStateAction } from "react";
import { FormEvent, useState } from "react";

export function UnblockFlow({
  block,
  open,
  setOpen,
}: {
  block: BlockRow | null;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const [step, setStep] = useState<
    "clarity" | "courage" | "inertia" | "buddy"
  >("clarity");
  const [clarityAnswer, setClarityAnswer] = useState("");
  const [courageAnswer, setCourageAnswer] = useState("");
  const [buddyName, setBuddyName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open || !block) return null;

  async function saveBuddy(event: FormEvent) {
    event.preventDefault();
    if (!block) return;
    const target = block;
    setBusy(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const client = createClient();
      await client
        .from("blocks")
        .update({
          accountability_buddy: buddyName || null,
          stuck_flag: false,
        })
        .eq("id", target.id);
      setBuddyName("");
      setClarityAnswer("");
      setCourageAnswer("");
      setStep("clarity");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  function closeModal() {
    setOpen(false);
    setStep("clarity");
    setClarityAnswer("");
    setCourageAnswer("");
    setBuddyName("");
  }

  async function persistStuck() {
    if (!block) return;
    const target = block;
    const { createClient } = await import("@/lib/supabase/client");
    await createClient()
      .from("blocks")
      .update({ stuck_flag: true })
      .eq("id", target.id);
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 px-6 flex flex-col gap-10 py-14">
      <header className="label text-[var(--neon)] flex justify-between items-start">
        Procrastination SOS · Unblock
        <button
          type="button"
          className="text-[10px] border border-text px-2 py-1"
          onClick={closeModal}
        >
          CLOSE
        </button>
      </header>

      <p className="text-xs font-mono text-white/70">{block.task_name}</p>

      {step === "clarity" && (
        <StepCard
          title="Clarity"
          subtitle="Verify the smallest next motion is undeniable."
          onAdvance={async () => {
            await persistStuck();
            setStep("courage");
          }}
        >
          <textarea
            className="brutalist-input min-h-[100px]"
            value={clarityAnswer}
            onChange={(e) => setClarityAnswer(e.target.value)}
            placeholder="Literal next keystroke?"
          />
        </StepCard>
      )}

      {step === "courage" && (
        <StepCard
          title="Courage"
          subtitle="Name the friction under the friction."
          onAdvance={() => setStep("inertia")}
        >
          <textarea
            className="brutalist-input min-h-[120px]"
            value={courageAnswer}
            onChange={(e) => setCourageAnswer(e.target.value)}
            placeholder="What are you pretending not to know?"
          />
        </StepCard>
      )}

      {step === "inertia" && (
        <div className="flex flex-col gap-6 items-center justify-center py-12">
          <Timer initialSeconds={300} label='Inertia · 5 Minute "discipline capsule"' />
          <button type="button" className="brutalist-btn" onClick={() => setStep("buddy")}>
            I FINISHED MY DOSE · NEXT
          </button>
        </div>
      )}

      {step === "buddy" && (
        <form
          className="border-2 border-text p-8 flex flex-col gap-6 max-w-md mx-auto"
          onSubmit={saveBuddy}
        >
          <label className="label flex flex-col gap-2">
            Accountability buddy for this block
            <input
              className="brutalist-input"
              value={buddyName}
              onChange={(e) => setBuddyName(e.target.value)}
              placeholder="Name or shortcut"
              required
            />
          </label>
          <button type="submit" disabled={busy} className="brutalist-btn">
            {busy ? "SAVING…" : "LOCK IN"}
          </button>
        </form>
      )}
    </div>
  );
}

function StepCard({
  title,
  subtitle,
  children,
  onAdvance,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onAdvance: () => void | Promise<void>;
}) {
  return (
    <div className="border-2 border-text p-10 flex flex-col gap-8 max-w-2xl mx-auto">
      <div>
        <p className="label text-[var(--neon)]">{title}</p>
        <p className="text-sm font-mono text-white mt-4">{subtitle}</p>
      </div>
      {children}
      <button
        type="button"
        className="brutalist-btn self-start"
        onClick={() => void onAdvance()}
      >
        NEXT · LOCK IT IN
      </button>
    </div>
  );
}
