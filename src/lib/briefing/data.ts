import type { SupabaseClient } from "@supabase/supabase-js";
import { getDayLabel, getDayRange } from "@/lib/time/today";
import { KJ_TO_KCAL } from "@/lib/aggregates-shared";
import type { BriefingInput } from "./generate";

export async function buildBriefingInput(
  supabase: SupabaseClient,
  userId: string,
): Promise<BriefingInput> {
  const today = getDayLabel();
  const { startIso, endIso } = getDayRange(today);
  const sevenDaysAgo = new Date(new Date(`${today}T00:00:00Z`).getTime() - 7 * 86_400_000);

  const [
    todayRecovery,
    todaySleep,
    todayCycle,
    todayEvents,
    todayMeals,
    weekRecovery,
    weekCycles,
    weekSleep,
    weekMeals,
    targets,
  ] = await Promise.all([
    supabase
      .from("whoop_recovery")
      .select("recovery_score, hrv_rmssd_milli, resting_heart_rate, period_start")
      .eq("user_id", userId)
      .gte("period_start", startIso)
      .lt("period_start", endIso)
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("whoop_sleep")
      .select(
        "total_in_bed_ms, total_awake_ms, sleep_performance_pct, start_at, nap",
      )
      .eq("user_id", userId)
      .eq("nap", false)
      .gte("start_at", startIso)
      .lt("start_at", endIso)
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("whoop_cycles")
      .select("strain, kilojoule, start_at")
      .eq("user_id", userId)
      .gte("start_at", startIso)
      .lt("start_at", endIso)
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("calendar_events")
      .select("summary, start_at, end_at, all_day, status")
      .eq("user_id", userId)
      .gte("end_at", startIso)
      .lt("start_at", endIso)
      .neq("status", "cancelled")
      .order("start_at", { ascending: true }),
    supabase
      .from("meals")
      .select("name, calories, protein_g, carbs_g, fat_g, eaten_at")
      .eq("user_id", userId)
      .gte("eaten_at", startIso)
      .lt("eaten_at", endIso),
    supabase
      .from("whoop_recovery")
      .select("recovery_score, hrv_rmssd_milli, period_start")
      .eq("user_id", userId)
      .gte("period_start", sevenDaysAgo.toISOString()),
    supabase
      .from("whoop_cycles")
      .select("strain, kilojoule, start_at")
      .eq("user_id", userId)
      .gte("start_at", sevenDaysAgo.toISOString()),
    supabase
      .from("whoop_sleep")
      .select("total_in_bed_ms, total_awake_ms, start_at, nap")
      .eq("user_id", userId)
      .eq("nap", false)
      .gte("start_at", sevenDaysAgo.toISOString()),
    supabase
      .from("meals")
      .select("calories, eaten_at")
      .eq("user_id", userId)
      .gte("eaten_at", sevenDaysAgo.toISOString()),
    supabase
      .from("macros_targets")
      .select("daily_calories, protein_g, carbs_g, fat_g")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const sleepHours = todaySleep.data?.total_in_bed_ms
    ? ((todaySleep.data.total_in_bed_ms - (todaySleep.data.total_awake_ms ?? 0)) / 3_600_000)
    : null;

  type Bucket = {
    recovery: number[];
    hrv: number[];
    strain: number[];
    kcalIn: number;
    kcalOut: number | null;
    sleepHours: number | null;
  };
  const byDate = new Map<string, Bucket>();
  const get = (d: string) => {
    if (!byDate.has(d)) {
      byDate.set(d, {
        recovery: [],
        hrv: [],
        strain: [],
        kcalIn: 0,
        kcalOut: null,
        sleepHours: null,
      });
    }
    return byDate.get(d)!;
  };

  for (const r of weekRecovery.data ?? []) {
    const d = getDayLabel(new Date(r.period_start));
    const b = get(d);
    if (r.recovery_score != null) b.recovery.push(r.recovery_score);
    if (r.hrv_rmssd_milli != null) b.hrv.push(r.hrv_rmssd_milli);
  }
  for (const c of weekCycles.data ?? []) {
    const d = getDayLabel(new Date(c.start_at));
    const b = get(d);
    if (c.strain != null) b.strain.push(c.strain);
    if (c.kilojoule != null) {
      b.kcalOut = (b.kcalOut ?? 0) + Math.round(c.kilojoule * KJ_TO_KCAL);
    }
  }
  for (const s of weekSleep.data ?? []) {
    const d = getDayLabel(new Date(s.start_at));
    const b = get(d);
    if (s.total_in_bed_ms != null) {
      b.sleepHours = (s.total_in_bed_ms - (s.total_awake_ms ?? 0)) / 3_600_000;
    }
  }
  for (const m of weekMeals.data ?? []) {
    const d = getDayLabel(new Date(m.eaten_at));
    const b = get(d);
    b.kcalIn += m.calories ?? 0;
  }

  const recent7Days = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([date, b]) => ({
      date,
      recovery: b.recovery.length ? avg(b.recovery) : null,
      hrv: b.hrv.length ? avg(b.hrv) : null,
      strain: b.strain.length ? Math.max(...b.strain) : null,
      kcalIn: b.kcalIn || null,
      kcalOut: b.kcalOut,
      sleepHours: b.sleepHours,
    }));

  const totalsSoFar = (todayMeals.data ?? []).reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories ?? 0),
      protein_g: acc.protein_g + (m.protein_g ?? 0),
      carbs_g: acc.carbs_g + (m.carbs_g ?? 0),
      fat_g: acc.fat_g + (m.fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

  return {
    todayDateLabel: today,
    today: {
      recovery: todayRecovery.data?.recovery_score ?? null,
      hrv: todayRecovery.data?.hrv_rmssd_milli ?? null,
      restingHr: todayRecovery.data?.resting_heart_rate ?? null,
      strain: todayCycle.data?.strain ?? null,
      sleepHours,
      sleepPerformancePct: todaySleep.data?.sleep_performance_pct ?? null,
    },
    recent7Days,
    todaysEvents: (todayEvents.data ?? []).map((e) => ({
      summary: e.summary ?? "(no title)",
      start: e.start_at,
      end: e.end_at,
      allDay: e.all_day,
    })),
    todaysMealsSoFar: (todayMeals.data ?? []).map((m) => ({
      name: m.name,
      calories: m.calories ?? 0,
    })),
    targets: targets.data
      ? {
          daily_calories: targets.data.daily_calories,
          protein_g: targets.data.protein_g,
          carbs_g: targets.data.carbs_g,
          fat_g: targets.data.fat_g,
        }
      : null,
    totalsSoFar,
  };
}

function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
