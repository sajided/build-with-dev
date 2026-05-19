import { AdventureView } from "@/components/adventure/AdventureView";
import { createClient } from "@/lib/supabase/server";
import type { BlockRow } from "@/lib/types";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ blockId: string }>;
}

export default async function AdventurePage({ params }: PageProps) {
  const supabase = await createClient();
  const { blockId } = await params;
  const { data } = await supabase
    .from("blocks")
    .select("*")
    .eq("id", blockId)
    .maybeSingle();

  if (!data) {
    redirect("/today");
  }

  return (
    <div className="bg-bg">
      <AdventureView initialBlock={data as unknown as BlockRow} />
    </div>
  );
}
