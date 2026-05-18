import { createClient } from "@/lib/supabase/server";

export type WhoopToday = {
  recovery: { score: number | null; restingHr: number | null; hrv: number | null } | null;
  sleep: {
    performancePct: number | null;
    efficiencyPct: number | null;
    totalInBedMs: number | null;
    totalAwakeMs: number | null;
    startAt: string;
    endAt: string;
  } | null;
  strain: { strain: number | null; cycleStart: string; cycleEnd: string | null } | null;
};

export async function getWhoopToday(): Promise<WhoopToday | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [recovery, sleep, cycle] = await Promise.all([
    supabase
      .from("whoop_recovery")
      .select("recovery_score, resting_heart_rate, hrv_rmssd_milli, score_state")
      .eq("user_id", user.id)
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("whoop_sleep")
      .select(
        "sleep_performance_pct, sleep_efficiency_pct, total_in_bed_ms, total_awake_ms, start_at, end_at, nap, score_state",
      )
      .eq("user_id", user.id)
      .eq("nap", false)
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("whoop_cycles")
      .select("strain, start_at, end_at, score_state")
      .eq("user_id", user.id)
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
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
          totalInBedMs: sleep.data.total_in_bed_ms,
          totalAwakeMs: sleep.data.total_awake_ms,
          startAt: sleep.data.start_at,
          endAt: sleep.data.end_at,
        }
      : null,
    strain: cycle.data
      ? {
          strain: cycle.data.strain,
          cycleStart: cycle.data.start_at,
          cycleEnd: cycle.data.end_at,
        }
      : null,
  };
}

export function formatSleepDuration(totalInBedMs: number | null, totalAwakeMs: number | null) {
  if (totalInBedMs == null) return null;
  const asleepMs = totalInBedMs - (totalAwakeMs ?? 0);
  const hours = Math.floor(asleepMs / 3_600_000);
  const minutes = Math.round((asleepMs % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}
