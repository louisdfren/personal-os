import { createClient } from "@/lib/supabase/server";
import { APP_TIMEZONE, getDayLabel } from "@/lib/time/today";
import type { DailyPoint } from "./aggregates-shared";

export { KJ_TO_KCAL, baseline, rollingMean } from "./aggregates-shared";
export type { DailyPoint, Baseline } from "./aggregates-shared";

const KJ_TO_KCAL_LOCAL = 1 / 4.184;

function londonDay(iso: string): string {
  return getDayLabel(new Date(iso));
}

function emptyMap(days: number, endDate: string): Map<string, DailyPoint> {
  const map = new Map<string, DailyPoint>();
  const end = new Date(`${endDate}T12:00:00Z`);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 24 * 60 * 60 * 1000);
    const label = d.toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
    map.set(label, {
      date: label,
      recovery: null,
      hrv: null,
      restingHr: null,
      strain: null,
      kcalBurnt: null,
      kcalIntake: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
      sleepAsleepMs: null,
      workoutCount: 0,
    });
  }
  return map;
}

export async function getDailySeries(days: number): Promise<DailyPoint[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const today = getDayLabel();
  const points = emptyMap(days, today);
  const earliest = Array.from(points.keys())[0];
  const earliestIso = new Date(`${earliest}T00:00:00Z`).toISOString();

  const [recovery, cycles, sleep, workouts, meals] = await Promise.all([
    supabase
      .from("whoop_recovery")
      .select("recovery_score, hrv_rmssd_milli, resting_heart_rate, period_start")
      .eq("user_id", user.id)
      .gte("period_start", earliestIso)
      .order("period_start", { ascending: true }),
    supabase
      .from("whoop_cycles")
      .select("strain, kilojoule, start_at")
      .eq("user_id", user.id)
      .gte("start_at", earliestIso)
      .order("start_at", { ascending: true }),
    supabase
      .from("whoop_sleep")
      .select("total_in_bed_ms, total_awake_ms, start_at, nap")
      .eq("user_id", user.id)
      .eq("nap", false)
      .gte("start_at", earliestIso)
      .order("start_at", { ascending: true }),
    supabase
      .from("whoop_workouts")
      .select("start_at")
      .eq("user_id", user.id)
      .gte("start_at", earliestIso),
    supabase
      .from("meals")
      .select("calories, protein_g, carbs_g, fat_g, eaten_at")
      .eq("user_id", user.id)
      .gte("eaten_at", earliestIso),
  ]);

  for (const r of recovery.data ?? []) {
    const p = points.get(londonDay(r.period_start));
    if (!p) continue;
    p.recovery = r.recovery_score;
    p.hrv = r.hrv_rmssd_milli;
    p.restingHr = r.resting_heart_rate;
  }
  for (const c of cycles.data ?? []) {
    const p = points.get(londonDay(c.start_at));
    if (!p) continue;
    p.strain = c.strain;
    p.kcalBurnt = c.kilojoule != null ? Math.round(c.kilojoule * KJ_TO_KCAL_LOCAL) : null;
  }
  for (const s of sleep.data ?? []) {
    const p = points.get(londonDay(s.start_at));
    if (!p) continue;
    if (s.total_in_bed_ms != null) {
      p.sleepAsleepMs = (s.total_in_bed_ms ?? 0) - (s.total_awake_ms ?? 0);
    }
  }
  for (const w of workouts.data ?? []) {
    const p = points.get(londonDay(w.start_at));
    if (!p) continue;
    p.workoutCount += 1;
  }
  for (const m of meals.data ?? []) {
    const p = points.get(londonDay(m.eaten_at));
    if (!p) continue;
    p.kcalIntake = (p.kcalIntake ?? 0) + (m.calories ?? 0);
    p.proteinG = (p.proteinG ?? 0) + (m.protein_g ?? 0);
    p.carbsG = (p.carbsG ?? 0) + (m.carbs_g ?? 0);
    p.fatG = (p.fatG ?? 0) + (m.fat_g ?? 0);
  }

  return Array.from(points.values());
}
