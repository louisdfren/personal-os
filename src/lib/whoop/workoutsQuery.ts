import { createClient } from "@/lib/supabase/server";
import { APP_TIMEZONE, getDayLabel } from "@/lib/time/today";

export type WorkoutRow = {
  date: string; // YYYY-MM-DD London
  sportName: string;
  strain: number | null;
  durationMin: number;
  avgHr: number | null;
  maxHr: number | null;
  startAt: string;
};

export async function getWorkouts(days: number): Promise<WorkoutRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const earliest = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("whoop_workouts")
    .select("sport_name, strain, average_heart_rate, max_heart_rate, start_at, end_at")
    .eq("user_id", user.id)
    .gte("start_at", earliest)
    .order("start_at", { ascending: false });
  if (error) return [];

  return (data ?? []).map((w) => {
    const start = new Date(w.start_at).getTime();
    const end = new Date(w.end_at).getTime();
    return {
      date: getDayLabel(new Date(w.start_at)),
      sportName: w.sport_name,
      strain: w.strain,
      durationMin: Math.max(0, Math.round((end - start) / 60000)),
      avgHr: w.average_heart_rate,
      maxHr: w.max_heart_rate,
      startAt: w.start_at,
    } satisfies WorkoutRow;
  });
}

export function joinRecovery(
  workouts: WorkoutRow[],
  dailyRecoveryByDate: Map<string, number | null>,
): Array<WorkoutRow & { nextDayRecovery: number | null }> {
  return workouts.map((w) => {
    const next = new Date(`${w.date}T00:00:00`);
    next.setDate(next.getDate() + 1);
    const nextLabel = next.toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
    return { ...w, nextDayRecovery: dailyRecoveryByDate.get(nextLabel) ?? null };
  });
}
