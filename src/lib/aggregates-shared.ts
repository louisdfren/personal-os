export const KJ_TO_KCAL = 1 / 4.184;

export type DailyPoint = {
  date: string;
  recovery: number | null;
  hrv: number | null;
  restingHr: number | null;
  strain: number | null;
  kcalBurnt: number | null;
  kcalIntake: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  sleepAsleepMs: number | null;
  workoutCount: number;
};

export type MacrosTargets = {
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type AdherenceStatus = "under" | "on" | "over" | "none";

const TOLERANCE = 0.1;

export function statusFor(value: number | null, target: number): AdherenceStatus {
  if (value == null || target <= 0) return "none";
  const ratio = value / target;
  if (ratio < 1 - TOLERANCE) return "under";
  if (ratio > 1 + TOLERANCE) return "over";
  return "on";
}

export type AdherenceCounts = {
  hit: number;
  under: number;
  over: number;
  total: number;
};

export function countAdherence(
  series: DailyPoint[],
  target: number,
  pick: (p: DailyPoint) => number | null,
): AdherenceCounts {
  const counts: AdherenceCounts = { hit: 0, under: 0, over: 0, total: 0 };
  for (const p of series) {
    const v = pick(p);
    if (v == null) continue;
    counts.total += 1;
    const s = statusFor(v, target);
    if (s === "on") counts.hit += 1;
    else if (s === "under") counts.under += 1;
    else if (s === "over") counts.over += 1;
  }
  return counts;
}

export type Baseline = { mean: number; std: number; n: number };

export function baseline(values: Array<number | null>): Baseline | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length < 3) return null;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  return { mean, std: Math.sqrt(variance), n: nums.length };
}

export function rollingMean(values: Array<number | null>, window: number): Array<number | null> {
  const out: Array<number | null> = [];
  for (let i = 0; i < values.length; i++) {
    const slice = values
      .slice(Math.max(0, i - window + 1), i + 1)
      .filter((v): v is number => v != null);
    out.push(slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : null);
  }
  return out;
}
