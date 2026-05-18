import { createClient } from "@/lib/supabase/server";
import { getDayRange } from "@/lib/time/today";

export type DayDetail = {
  recovery: {
    score: number | null;
    restingHr: number | null;
    hrv: number | null;
  } | null;
  sleep: {
    performancePct: number | null;
    efficiencyPct: number | null;
    consistencyPct: number | null;
    totalInBedMs: number | null;
    totalAwakeMs: number | null;
    totalRemMs: number | null;
    totalSwsMs: number | null;
    startAt: string;
    endAt: string;
  } | null;
  cycle: { strain: number | null; kilojoule: number | null; startAt: string; endAt: string | null } | null;
  workouts: Array<{
    id: string;
    sportName: string;
    strain: number | null;
    durationMin: number;
    avgHr: number | null;
    maxHr: number | null;
    startAt: string;
  }>;
};

export async function getWhoopForDay(dateLabel: string): Promise<DayDetail> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { recovery: null, sleep: null, cycle: null, workouts: [] };

  const { startIso, endIso } = getDayRange(dateLabel);

  const [recovery, sleep, cycle, workouts] = await Promise.all([
    supabase
      .from("whoop_recovery")
      .select("recovery_score, resting_heart_rate, hrv_rmssd_milli, period_start")
      .eq("user_id", user.id)
      .gte("period_start", startIso)
      .lt("period_start", endIso)
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("whoop_sleep")
      .select(
        "sleep_performance_pct, sleep_efficiency_pct, sleep_consistency_pct, total_in_bed_ms, total_awake_ms, total_rem_sleep_ms, total_slow_wave_ms, start_at, end_at",
      )
      .eq("user_id", user.id)
      .eq("nap", false)
      .gte("start_at", startIso)
      .lt("start_at", endIso)
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("whoop_cycles")
      .select("strain, kilojoule, start_at, end_at")
      .eq("user_id", user.id)
      .gte("start_at", startIso)
      .lt("start_at", endIso)
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("whoop_workouts")
      .select("whoop_workout_id, sport_name, strain, average_heart_rate, max_heart_rate, start_at, end_at")
      .eq("user_id", user.id)
      .gte("start_at", startIso)
      .lt("start_at", endIso)
      .order("start_at", { ascending: true }),
  ]);

  return {
    recovery: recovery.data
      ? {
          score: recovery.data.recovery_score,
          restingHr: recovery.data.resting_heart_rate,
          hrv: recovery.data.hrv_rmssd_milli,
        }
      : null,
    sleep: sleep.data
      ? {
          performancePct: sleep.data.sleep_performance_pct,
          efficiencyPct: sleep.data.sleep_efficiency_pct,
          consistencyPct: sleep.data.sleep_consistency_pct,
          totalInBedMs: sleep.data.total_in_bed_ms,
          totalAwakeMs: sleep.data.total_awake_ms,
          totalRemMs: sleep.data.total_rem_sleep_ms,
          totalSwsMs: sleep.data.total_slow_wave_ms,
          startAt: sleep.data.start_at,
          endAt: sleep.data.end_at,
        }
      : null,
    cycle: cycle.data
      ? {
          strain: cycle.data.strain,
          kilojoule: cycle.data.kilojoule,
          startAt: cycle.data.start_at,
          endAt: cycle.data.end_at,
        }
      : null,
    workouts: (workouts.data ?? []).map((w) => ({
      id: w.whoop_workout_id,
      sportName: w.sport_name,
      strain: w.strain,
      durationMin: Math.max(
        0,
        Math.round((new Date(w.end_at).getTime() - new Date(w.start_at).getTime()) / 60000),
      ),
      avgHr: w.average_heart_rate,
      maxHr: w.max_heart_rate,
      startAt: w.start_at,
    })),
  };
}
