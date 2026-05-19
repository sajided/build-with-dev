import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runReceiptCoach } from "@/lib/gemini";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { date?: string };
  const date = body.date;
  if (!date) {
    return NextResponse.json({ error: "date required (YYYY-MM-DD)" }, { status: 400 });
  }

  const { data: day, error } = await supabase
    .from("days")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();

  if (error || !day) {
    return NextResponse.json({ error: "Day not found" }, { status: 404 });
  }

  const { data: blocks } = await supabase
    .from("blocks")
    .select("*")
    .eq("day_id", day.id);

  let focusedMinutes = 0;
  for (const b of blocks ?? []) {
    if (typeof b.status === "string" && b.status === "completed") {
      focusedMinutes += spanMinutes(b.start_time as string, b.end_time as string);
    }
  }

  const normalizedAdventure =
    typeof day.daily_adventure === "string"
      ? day.daily_adventure.toLowerCase()
      : "";

  const adventureMarkedSuccess = (blocks ?? []).some((b) => {
    const name = typeof b.task_name === "string" ? b.task_name.toLowerCase() : "";
    return (
      b.status === "completed" &&
      !!normalizedAdventure &&
      normalizedAdventure.length > 2 &&
      name.includes(normalizedAdventure.slice(0, Math.min(16, normalizedAdventure.length)))
    );
  });

  const summaryParts = [
    `Daily adventure: ${day.daily_adventure ?? "unset"}`,
    `Side quests: ${JSON.stringify(day.side_quests ?? [])}`,
    `Focused minutes (completed blocks): ${focusedMinutes}`,
    `Daily adventure SUCCESS heuristic: ${adventureMarkedSuccess ? "YES" : "NO"}`,
    `Coach prior note: ${day.coaching_message ?? ""}`,
  ];

  try {
    const coach = await runReceiptCoach(summaryParts.join("\n"));

    const receiptPayload = {
      dailyAdventure: day.daily_adventure ?? "",
      adventureStatus: adventureMarkedSuccess ? "SUCCESS" : "SKIPPED",
      sideQuests: Array.isArray(day.side_quests) ? day.side_quests : [],
      focusedMinutes,
      signOff: coach,
      generatedAt: new Date().toISOString(),
    };

    await supabase
      .from("days")
      .update({
        receipt_generated: true,
        receipt_data: receiptPayload as unknown as Record<string, unknown>,
      })
      .eq("id", day.id);

    return NextResponse.json({ receipt: receiptPayload });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Receipt failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function spanMinutes(start: string, end: string) {
  const parse = (s: string) => {
    const p = s.slice(0, 5).split(":");
    return Number(p[0]) * 60 + Number(p[1]);
  };
  try {
    const a = parse(start);
    const b = parse(end);
    return Math.max(b - a, 0);
  } catch {
    return 0;
  }
}
