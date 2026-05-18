import { createClient } from "@/lib/supabase/server";
import { getDayLabel } from "@/lib/time/today";

export type BriefingRow = {
  briefing_date: string;
  headline: string;
  body: string;
  recovery_call: string | null;
  nutrition_call: string | null;
  schedule_call: string | null;
  watch_for: string | null;
  created_at: string;
};

export async function getTodayBriefing(): Promise<BriefingRow | null> {
  return getBriefingForDay(getDayLabel());
}

export async function getBriefingForDay(dateLabel: string): Promise<BriefingRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("daily_briefings")
    .select(
      "briefing_date, headline, body, recovery_call, nutrition_call, schedule_call, watch_for, created_at",
    )
    .eq("user_id", user.id)
    .eq("briefing_date", dateLabel)
    .maybeSingle();
  return (data as BriefingRow) ?? null;
}
