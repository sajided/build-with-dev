"use client";

import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { useSessionReady } from "@/components/EnsureSession";
import { ThreePsModal } from "@/components/modals/ThreePsModal";
import { UnblockFlow } from "@/components/modals/UnblockFlow";
import { createClient } from "@/lib/supabase/client";
import type { BlockRow, ChatMessageRow, DayRow } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function todayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function TodayPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const sessionReady = useSessionReady();

  const [day, setDay] = useState<DayRow | null>(null);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [busyChat, setBusyChat] = useState(false);

  const [threeBlock, setThreeBlock] = useState<BlockRow | null>(null);
  const [unstickBlock, setUnstickBlock] = useState<BlockRow | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);

  const pullDaySnapshot = useCallback(
    async (dayId: string) => {
      const { data: b } = await supabase
        .from("blocks")
        .select("*")
        .eq("day_id", dayId)
        .order("start_time");

      const { data: m } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("day_id", dayId)
        .order("created_at", { ascending: true });

      const { data: d } = await supabase
        .from("days")
        .select("*")
        .eq("id", dayId)
        .maybeSingle();

      if (Array.isArray(b)) setBlocks(b as unknown as BlockRow[]);
      if (Array.isArray(m)) setMessages(m as unknown as ChatMessageRow[]);
      if (d) setDay(d as unknown as DayRow);
    },
    [supabase],
  );

  useEffect(() => {
    if (!sessionReady) return;
    let cancelled = false;

    async function bootstrap() {
      const {
        data: { user: initialUser },
      } = await supabase.auth.getUser();
      if (cancelled) return;

      let user = initialUser;
      if (!user) {
        const { error: anonErr } = await supabase.auth.signInAnonymously();
        if (anonErr) {
          console.error("[today] anonymous session", anonErr);
          return;
        }
        const { data } = await supabase.auth.getUser();
        user = data.user ?? null;
      }

      if (!user || cancelled) {
        return;
      }

      const dateIso = todayUtcDate();
      let { data: existing } = await supabase
        .from("days")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", dateIso)
        .maybeSingle();

      if (!existing) {
        const { data: inserted, error } = await supabase
          .from("days")
          .insert({
            user_id: user.id,
            date: dateIso,
            side_quests: [],
          })
          .select()
          .single();
        if (error) throw error;
        existing = inserted;
      }

      setDay(existing as unknown as DayRow);

      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("day_id", existing.id as string)
        .order("created_at", { ascending: true });

      const { data: blks } = await supabase
        .from("blocks")
        .select("*")
        .eq("day_id", existing.id as string)
        .order("start_time");

      if (!cancelled) {
        setMessages((msgs ?? []) as unknown as ChatMessageRow[]);
        setBlocks((blks ?? []) as unknown as BlockRow[]);
      }
    }

    bootstrap().catch((e) =>
      console.error("[today/bootstrap]", e),
    );

    return () => {
      cancelled = true;
    };
  }, [sessionReady, supabase]);

  useEffect(() => {
    if (!sessionReady || !day?.id) return;
    const chan = supabase
      .channel(`today-${day.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "blocks",
          filter: `day_id=eq.${day.id}`,
        },
        () => pullDaySnapshot(day.id),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `day_id=eq.${day.id}`,
        },
        () => pullDaySnapshot(day.id),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "days",
          filter: `id=eq.${day.id}`,
        },
        () => pullDaySnapshot(day.id),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chan);
    };
  }, [day?.id, pullDaySnapshot, sessionReady, supabase]);

  async function handleSend(text: string) {
    if (!sessionReady || !day) return;

    const {
      data: { user: initialUser },
    } = await supabase.auth.getUser();
    let user = initialUser;
    if (!user) {
      const { error: anonErr } = await supabase.auth.signInAnonymously();
      if (anonErr) return;
      const { data } = await supabase.auth.getUser();
      user = data.user ?? null;
    }
    if (!user) return;

    setBusyChat(true);
    const { error } = await supabase.from("chat_messages").insert({
      user_id: user.id,
      day_id: day.id,
      role: "user",
      content: text,
    });
    if (error) {
      console.error(error);
      setBusyChat(false);
      return;
    }

    await pullDaySnapshot(day.id);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dayId: day.id }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        console.error(body);
      }
      await pullDaySnapshot(day.id);
    } finally {
      setBusyChat(false);
    }
  }

  async function handleReceiptFinal() {
    if (!sessionReady || !day) return;
    setReceiptBusy(true);
    try {
      const iso = typeof day.date === "string" ? day.date.slice(0, 10) : todayUtcDate();
      const response = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: iso }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        console.error(body);
      }
      router.push(`/receipt/${iso}`);
    } finally {
      setReceiptBusy(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-bg text-text">
      <ThreePsModal
        block={threeBlock}
        open={!!threeBlock}
        setOpen={(open) => {
          if (!open) setThreeBlock(null);
        }}
        onSaved={(targetId) => {
          setThreeBlock(null);
          router.push(`/adventure/${targetId}`);
        }}
      />
      <UnblockFlow
        block={unstickBlock}
        open={!!unstickBlock}
        setOpen={(open) => {
          if (!open) setUnstickBlock(null);
        }}
      />

      <header className="border-b-2 border-text px-8 py-6 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="label text-[var(--neon)]">VibeTime</p>
          <h1 className="text-xl font-semibold mt-4">
            TODAY · {(day?.date ?? todayUtcDate()).toString()}
          </h1>
          <p className="text-[11px] text-white/60 mt-4 max-w-md">
            {day?.daily_adventure
              ? `Daily Adventure: ${day.daily_adventure}`
              : "No adventure locked yet. Talk to coach."}{" "}
          </p>
          {Boolean(day?.coaching_message?.trim?.()) && (
            <p className="mt-4 text-[11px] text-[var(--neon)]">
              {day?.coaching_message}
            </p>
          )}
        </div>

        <div className="flex flex-col md:items-end gap-3 md:text-right font-mono text-xs uppercase">
          <button
            type="button"
            disabled={receiptBusy}
            className="brutalist-btn border-[var(--neon)] text-[var(--neon)]"
            onClick={() => handleReceiptFinal()}
          >
            {receiptBusy ? "STAMPING RECEIPT..." : "END DAY RECEIPT"}
          </button>
          <Link className="brutalist-btn inline-block px-8 py-2" href={`/receipt/${(day?.date ?? todayUtcDate()).toString()}`}>
            VIEW RECEIPT
          </Link>
        </div>
      </header>

      <main className="flex-1 px-8 py-8 grid lg:grid-cols-2 gap-8">
        <div className="h-[720px]">
          <ChatPanel
            dayId={day?.id ?? null}
            messages={messages}
            sending={busyChat}
            onSend={handleSend}
          />
        </div>
        <div className="h-[720px] overflow-hidden">
          <CalendarGrid
            blocks={blocks}
            dayPriorityFlag={day?.coaching_priority_flag ?? null}
            onStartWorkAdventure={(b) => setThreeBlock(b)}
            onStuck={(b) => setUnstickBlock(b)}
          />
        </div>
      </main>
    </div>
  );
}
