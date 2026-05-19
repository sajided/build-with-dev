import { ThermalReceipt } from "@/components/receipt/ThermalReceipt";
import { createClient } from "@/lib/supabase/server";
import type { DayRow } from "@/lib/types";
import Link from "next/link";

interface PageProps {
  params: Promise<{ date: string }>;
}

export default async function ReceiptPage({ params }: PageProps) {
  const supabase = await createClient();
  const { date } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dayRow: DayRow | null = null;
  if (user) {
    const { data } = await supabase
      .from("days")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .maybeSingle();

    dayRow = (data ?? null) as unknown as DayRow | null;
  }

  return (
    <div className="min-h-dvh px-8 py-12 flex flex-col gap-10 bg-black text-white">
      <div className="flex justify-between">
        <Link className="label text-[var(--neon)] underline" href="/today">
          ← TODAY
        </Link>
      </div>
      <ThermalReceipt date={date} day={dayRow} />
    </div>
  );
}
