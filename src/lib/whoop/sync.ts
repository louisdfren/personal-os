import type { SupabaseClient } from "@supabase/supabase-js";
import { whoopGetPaginated } from "./client";

type WhoopRecovery = {
  cycle_id: number;
  sleep_id: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  score_state: string;
  score?: {
    user_calibrating?: boolean;
    recovery_score?: number;
    resting_heart_rate?: number;
    hrv_rmssd_milli?: number;
    spo2_percentage?: number;
    skin_temp_celsius?: number;
  };
};

type WhoopSleep = {
  id: string;
  cycle_id?: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset?: string;
  nap: boolean;
  score_state: string;
  score?: {
    respiratory_rate?: number;
    sleep_performance_percentage?: number;
    sleep_consistency_percentage?: number;
    sleep_efficiency_percentage?: number;
    stage_summary?: {
      total_in_bed_time_milli?: number;
      total_awake_time_milli?: number;
      total_light_sleep_time_milli?: number;
      total_slow_wave_sleep_time_milli?: number;
      total_rem_sleep_time_milli?: number;
      sleep_cycle_count?: number;
      disturbance_count?: number;
    };
  };
};

type WhoopWorkout = {
  id: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset?: string;
  sport_name: string;
  score_state: string;
  score?: {
    strain?: number;
    average_heart_rate?: number;
    max_heart_rate?: number;
    kilojoule?: number;
    percent_recorded?: number;
    distance_meter?: number;
    altitude_gain_meter?: number;
    zone_durations?: {
      zone_zero_milli?: number;
      zone_one_milli?: number;
      zone_two_milli?: number;
      zone_three_milli?: number;
      zone_four_milli?: number;
      zone_five_milli?: number;
    };
  };
};

type WhoopCycle = {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end?: string;
  timezone_offset?: string;
  score_state: string;
  score?: {
    strain?: number;
    kilojoule?: number;
    average_heart_rate?: number;
    max_heart_rate?: number;
  };
};

export type SyncResult = {
  recovery: number;
  sleep: number;
  workouts: number;
  cycles: number;
};

export async function syncWhoopWindow(
  supabase: SupabaseClient,
  userId: string,
  start: string,
  end: string,
): Promise<SyncResult> {
  const [recovery, sleep, workouts, cycles] = await Promise.all([
    whoopGetPaginated<WhoopRecovery>(supabase, userId, "/v2/recovery", { start, end }),
    whoopGetPaginated<WhoopSleep>(supabase, userId, "/v2/activity/sleep", { start, end }),
    whoopGetPaginated<WhoopWorkout>(supabase, userId, "/v2/activity/workout", { start, end }),
    whoopGetPaginated<WhoopCycle>(supabase, userId, "/v2/cycle", { start, end }),
  ]);

  if (recovery.length) {
    const rows = recovery.map((r) => ({
      user_id: userId,
      whoop_cycle_id: r.cycle_id,
      whoop_sleep_id: r.sleep_id,
      score_state: r.score_state,
      user_calibrating: r.score?.user_calibrating ?? null,
      recovery_score: r.score?.recovery_score ?? null,
      resting_heart_rate: r.score?.resting_heart_rate ?? null,
      hrv_rmssd_milli: r.score?.hrv_rmssd_milli ?? null,
      spo2_percentage: r.score?.spo2_percentage ?? null,
      skin_temp_celsius: r.score?.skin_temp_celsius ?? null,
      period_start: r.created_at,
      whoop_created_at: r.created_at,
      whoop_updated_at: r.updated_at,
      raw: r,
    }));
    const { error } = await supabase
      .from("whoop_recovery")
      .upsert(rows, { onConflict: "user_id,whoop_cycle_id" });
    if (error) throw new Error(`whoop_recovery upsert: ${error.message}`);
  }

  if (sleep.length) {
    const rows = sleep.map((s) => ({
      user_id: userId,
      whoop_sleep_id: s.id,
      whoop_cycle_id: s.cycle_id ?? null,
      nap: s.nap,
      score_state: s.score_state,
      start_at: s.start,
      end_at: s.end,
      timezone_offset: s.timezone_offset ?? null,
      sleep_performance_pct: s.score?.sleep_performance_percentage ?? null,
      sleep_consistency_pct: s.score?.sleep_consistency_percentage ?? null,
      sleep_efficiency_pct: s.score?.sleep_efficiency_percentage ?? null,
      respiratory_rate: s.score?.respiratory_rate ?? null,
      total_in_bed_ms: s.score?.stage_summary?.total_in_bed_time_milli ?? null,
      total_awake_ms: s.score?.stage_summary?.total_awake_time_milli ?? null,
      total_light_sleep_ms: s.score?.stage_summary?.total_light_sleep_time_milli ?? null,
      total_slow_wave_ms: s.score?.stage_summary?.total_slow_wave_sleep_time_milli ?? null,
      total_rem_sleep_ms: s.score?.stage_summary?.total_rem_sleep_time_milli ?? null,
      sleep_cycle_count: s.score?.stage_summary?.sleep_cycle_count ?? null,
      disturbance_count: s.score?.stage_summary?.disturbance_count ?? null,
      period_start: s.start,
      whoop_created_at: s.created_at,
      whoop_updated_at: s.updated_at,
      raw: s,
    }));
    const { error } = await supabase
      .from("whoop_sleep")
      .upsert(rows, { onConflict: "user_id,whoop_sleep_id" });
    if (error) throw new Error(`whoop_sleep upsert: ${error.message}`);
  }

  if (workouts.length) {
    const rows = workouts.map((w) => ({
      user_id: userId,
      whoop_workout_id: w.id,
      sport_name: w.sport_name,
      score_state: w.score_state,
      start_at: w.start,
      end_at: w.end,
      timezone_offset: w.timezone_offset ?? null,
      strain: w.score?.strain ?? null,
      average_heart_rate: w.score?.average_heart_rate ?? null,
      max_heart_rate: w.score?.max_heart_rate ?? null,
      kilojoule: w.score?.kilojoule ?? null,
      percent_recorded: w.score?.percent_recorded ?? null,
      distance_meter: w.score?.distance_meter ?? null,
      altitude_gain_meter: w.score?.altitude_gain_meter ?? null,
      zone_zero_ms: w.score?.zone_durations?.zone_zero_milli ?? null,
      zone_one_ms: w.score?.zone_durations?.zone_one_milli ?? null,
      zone_two_ms: w.score?.zone_durations?.zone_two_milli ?? null,
      zone_three_ms: w.score?.zone_durations?.zone_three_milli ?? null,
      zone_four_ms: w.score?.zone_durations?.zone_four_milli ?? null,
      zone_five_ms: w.score?.zone_durations?.zone_five_milli ?? null,
      period_start: w.start,
      whoop_created_at: w.created_at,
      whoop_updated_at: w.updated_at,
      raw: w,
    }));
    const { error } = await supabase
      .from("whoop_workouts")
      .upsert(rows, { onConflict: "user_id,whoop_workout_id" });
    if (error) throw new Error(`whoop_workouts upsert: ${error.message}`);
  }

  if (cycles.length) {
    const rows = cycles.map((c) => ({
      user_id: userId,
      whoop_cycle_id: c.id,
      score_state: c.score_state,
      start_at: c.start,
      end_at: c.end ?? null,
      timezone_offset: c.timezone_offset ?? null,
      strain: c.score?.strain ?? null,
      kilojoule: c.score?.kilojoule ?? null,
      average_heart_rate: c.score?.average_heart_rate ?? null,
      max_heart_rate: c.score?.max_heart_rate ?? null,
      period_start: c.start,
      whoop_created_at: c.created_at,
      whoop_updated_at: c.updated_at,
      raw: c,
    }));
    const { error } = await supabase
      .from("whoop_cycles")
      .upsert(rows, { onConflict: "user_id,whoop_cycle_id" });
    if (error) throw new Error(`whoop_cycles upsert: ${error.message}`);
  }

  return {
    recovery: recovery.length,
    sleep: sleep.length,
    workouts: workouts.length,
    cycles: cycles.length,
  };
}
