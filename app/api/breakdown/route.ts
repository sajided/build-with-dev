import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runMakeItSmaller } from "@/lib/gemini";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { blockId?: string };
  const blockId = body.blockId;
  if (!blockId) {
    return NextResponse.json({ error: "blockId required" }, { status: 400 });
  }

  const { data: block, error } = await supabase
    .from("blocks")
    .select("*")
    .eq("id", blockId)
    .single();

  if (error || !block || block.user_id !== user.id) {
    return NextResponse.json({ error: "Block not found" }, { status: 404 });
  }

  try {
    const micro = await runMakeItSmaller(block.task_name as string);
    await supabase
      .from("blocks")
      .update({ micro_actions: micro })
      .eq("id", blockId);
    return NextResponse.json({ microActions: micro });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Breakdown failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
