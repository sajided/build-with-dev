import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runCoachConversation } from "@/lib/gemini";
import type { BlockType } from "@/lib/types";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { dayId?: string };
  const dayId = body.dayId;
  if (!dayId) {
    return NextResponse.json({ error: "dayId required" }, { status: 400 });
  }

  const { data: day, error: dayErr } = await supabase
    .from("days")
    .select("id,user_id")
    .eq("id", dayId)
    .single();

  if (dayErr || !day || day.user_id !== user.id) {
    return NextResponse.json({ error: "Day not found" }, { status: 404 });
  }

  const { data: msgs, error: msgErr } = await supabase
    .from("chat_messages")
    .select("role,content")
    .eq("day_id", dayId)
    .order("created_at", { ascending: true })
    .limit(80);

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  const history = (msgs ?? []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content as string,
  }));

  try {
    const result = await runCoachConversation(history);

    if (result.coachingPriorityFlag) {
      await supabase
        .from("days")
        .update({ coaching_priority_flag: result.coachingPriorityFlag })
        .eq("id", dayId);
    }

    if (result.scheduleComplete && result.blocks && result.blocks.length > 0) {
      await supabase.from("blocks").delete().eq("day_id", dayId);

      const rows =
        result.blocks?.map((b) => ({
          day_id: dayId,
          user_id: user.id,
          task_name: b.taskName,
          start_time: b.startTime.length === 5 ? `${b.startTime}:00` : b.startTime,
          end_time: b.endTime.length === 5 ? `${b.endTime}:00` : b.endTime,
          type: (b.type ?? "work") as BlockType,
          status: "pending" as const,
        })) ?? [];

      if (rows.length) {
        const { error: insErr } = await supabase.from("blocks").insert(rows);
        if (insErr) {
          console.error(insErr);
          return NextResponse.json({ error: insErr.message }, { status: 500 });
        }
      }

      await supabase
        .from("days")
        .update({
          daily_adventure: result.dailyAdventure,
          side_quests: result.sideQuests ?? [],
          coaching_message: result.coachingMessage,
        })
        .eq("id", dayId);
    }

    const { data: inserted, error: aiErr } = await supabase
      .from("chat_messages")
      .insert({
        user_id: user.id,
        day_id: dayId,
        role: "assistant" as const,
        content: result.assistantMessage,
      })
      .select()
      .single();

    if (aiErr || !inserted) {
      return NextResponse.json(
        { error: aiErr?.message ?? "insert failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, assistant: inserted });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Gemini invocation failed";
    console.error(message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
