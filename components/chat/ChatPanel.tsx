"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { MessageBubble } from "@/components/chat/MessageBubble";
import type { ChatMessageRow } from "@/lib/types";

export function ChatPanel({
  dayId,
  messages,
  onSend,
  sending,
}: {
  dayId: string | null;
  messages: ChatMessageRow[];
  onSend: (text: string) => Promise<void>;
  sending: boolean;
}) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || !dayId || sending) return;
    const t = text.trim();
    setText("");
    await onSend(t);
  }

  return (
    <section className="flex flex-col border-2 border-text h-full min-h-[360px]">
      <header className="label border-b-2 border-text px-4 py-3 text-[var(--neon)]">
        Coach Channel
      </header>
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto flex flex-col gap-3 p-4 bg-black"
      >
        {messages.length === 0 && (
          <p className="text-xs font-mono text-text/60">
            Dump your day. I will anchor commutes, gym, and social first. Then we
            lock one Daily Adventure and two Side Quests.
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
      </div>
      <form
        onSubmit={handleSubmit}
        className="border-t-2 border-text p-3 flex gap-2 items-end"
      >
        <textarea
          className="brutalist-input min-h-[72px] resize-y flex-1"
          placeholder="Morning dump…"
          value={text}
          disabled={!dayId || sending}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="brutalist-btn h-[72px] px-4" disabled={!dayId || sending}>
          {sending ? "…" : "SEND"}
        </button>
      </form>
    </section>
  );
}
